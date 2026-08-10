#!/usr/bin/env python3
"""Download and reduce official AOT CIAO telemetry for browser presentation."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

import numpy as np
from astropy.io import fits


ROOT = Path(__file__).resolve().parents[1]
OBSERVATIONS = ROOT / "data" / "observations"
FITS_NAME = "CIAO1_2019-12-06_DATA_EXPO-015808.fits"
FITS_URL = f"https://zenodo.org/records/8192742/files/{FITS_NAME}?download=1"
FITS_MD5 = "069b37b24997bf55c5312a7bad469502"
STRIDE = 50


def ensure_source() -> Path:
    OBSERVATIONS.mkdir(parents=True, exist_ok=True)
    source = OBSERVATIONS / FITS_NAME
    if not source.exists():
        request = Request(FITS_URL, headers={"User-Agent": "AO-Wavefront-Lab observation builder/1.0"})
        with urlopen(request, timeout=120) as response:
            source.write_bytes(response.read())
    digest = hashlib.md5(source.read_bytes()).hexdigest()
    if digest != FITS_MD5:
        raise ValueError(f"FITS MD5 mismatch: received {digest}, expected {FITS_MD5}")
    return source


def rounded(values: np.ndarray, digits: int = 6) -> list[object]:
    return np.round(values.astype(float), digits).tolist()


def text(value: object) -> str:
    return value.decode().strip() if isinstance(value, bytes) else str(value).strip()


def main() -> None:
    source = ensure_source()
    with fits.open(source, memmap=False) as hdul:
        loop = hdul["AOT_LOOPS"].data[0]
        timestamps = np.asarray(hdul["AOT_TIME"].data[0]["TIMESTAMPS"], dtype=float)
        selected = np.arange(0, len(timestamps), STRIDE)
        gradients = np.asarray(hdul["GRADIENTS"].data[selected], dtype=float)
        intensities = np.asarray(hdul["INTENSITIES"].data[selected], dtype=float)
        commands = np.asarray(hdul["HODM POSITIONS"].data[selected], dtype=float)
        seconds = timestamps[selected] - timestamps[0]
        primary = hdul[0].header
        source_row = hdul["AOT_SOURCES"].data[0]
        wfs = hdul["AOT_WAVEFRONT_SENSORS"].data[0]
        mirror = hdul["AOT_WAVEFRONT_CORRECTORS"].data[0]
        payload = {
            "dataset": "AOT proof-of-concept AO telemetry / ESO CIAO1",
            "format": primary["AOT-VERS"],
            "source": {
                "zenodoRecord": "https://zenodo.org/records/8192742",
                "doi": "10.5281/zenodo.8192742",
                "file": FITS_NAME,
                "downloadUrl": FITS_URL,
                "md5": FITS_MD5,
                "license": "Creative Commons Attribution 4.0 International",
                "instrument": primary["SYS-NAME"],
                "aoMode": primary["AO-MODE"],
                "dateBeginUtc": primary["DATE-BEG"],
                "dateEndUtc": primary["DATE-END"],
                "headerStrehlRatio": float(primary["STREHL-R"]),
                "headerTemporalError": float(primary["TEMP-ERR"]),
                "guideSourceType": text(source_row["TYPE"]),
                "wavefrontSensorType": text(wfs["TYPE"]),
                "wavefrontCorrectorType": text(mirror["TYPE"]),
                "loopState": text(loop["STATUS"]),
                "loopRateHz": float(loop["FRAMERATE"]),
                "originalFrameCount": int(len(timestamps)),
            },
            "processing": {
                "frameStride": STRIDE,
                "selectedFrameCount": int(len(selected)),
                "selection": "Every 50th released loop frame; numeric streams otherwise unmodified except JSON rounding to six decimal places.",
                "measurements": "GRADIENTS contains released Shack-Hartmann slope measurements; INTENSITIES contains released subaperture intensity values; HODM POSITIONS contains recorded deformable-mirror commands.",
                "limits": "No phase-map or PSF reconstruction is inferred from these streams in the observation view.",
            },
            "telemetry": {
                "seconds": rounded(seconds),
                "sourceFrameIndex": selected.tolist(),
                "gradientX": rounded(gradients[:, 0, :]),
                "gradientY": rounded(gradients[:, 1, :]),
                "subapertureIntensity": rounded(intensities),
                "hodmPosition": rounded(commands),
            },
        }

    output = OBSERVATIONS / "ciao1_aot_telemetry.json"
    output.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    metadata = {**payload["source"], **payload["processing"]}
    (OBSERVATIONS / "ciao1_aot_metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )
    print(
        f"Wrote {output}: {len(selected)} sampled frames from "
        f"{payload['source']['originalFrameCount']} released frames"
    )


if __name__ == "__main__":
    main()
