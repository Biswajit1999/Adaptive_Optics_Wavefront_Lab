"""Independent validation checks for the adaptive-optics teaching model.

These checks deliberately validate physical contracts rather than visual styling:
- low-order Zernike modes are approximately zero-mean over the sampled pupil;
- different supported Zernike modes are approximately orthogonal;
- scalar modal correction reduces residual RMS linearly;
- the sampled Fourier transform conserves energy under the same discrete convention.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


MODES = ("defocus", "astig", "coma", "trefoil")


def zernike(x: float, y: float, mode: str) -> float | None:
    rho2 = x * x + y * y
    if rho2 > 1.0:
        return None
    rho = math.sqrt(rho2)
    theta = math.atan2(y, x)
    if mode == "defocus":
        return math.sqrt(3.0) * (2.0 * rho**2 - 1.0)
    if mode == "astig":
        return math.sqrt(6.0) * rho**2 * math.cos(2.0 * theta)
    if mode == "coma":
        return math.sqrt(8.0) * (3.0 * rho**3 - 2.0 * rho) * math.cos(theta)
    if mode == "trefoil":
        return math.sqrt(8.0) * rho**3 * math.cos(3.0 * theta)
    raise ValueError(mode)


@dataclass(frozen=True)
class SampledMode:
    name: str
    values: tuple[float, ...]

    @property
    def mean(self) -> float:
        return sum(self.values) / len(self.values)

    @property
    def rms(self) -> float:
        return math.sqrt(sum(value * value for value in self.values) / len(self.values))


def sample_mode(mode: str, samples: int = 401) -> SampledMode:
    values: list[float] = []
    for iy in range(samples):
        y = 2.0 * (iy + 0.5) / samples - 1.0
        for ix in range(samples):
            x = 2.0 * (ix + 0.5) / samples - 1.0
            value = zernike(x, y, mode)
            if value is not None:
                values.append(value)
    return SampledMode(mode, tuple(values))


def dot(a: SampledMode, b: SampledMode) -> float:
    if len(a.values) != len(b.values):
        raise ValueError("sample grids do not match")
    return sum(x * y for x, y in zip(a.values, b.values)) / len(a.values)


def modal_residual(input_rms: float, gain: float) -> float:
    if not 0.0 <= gain <= 1.0:
        raise ValueError("gain is limited to the idealised stable interval [0, 1]")
    return (1.0 - gain) * input_rms


def discrete_dft2_energy(field: list[complex], n: int) -> tuple[float, float]:
    input_energy = sum(abs(value) ** 2 for value in field)
    output_energy = 0.0
    for ky in range(n):
        for kx in range(n):
            total = 0j
            for y in range(n):
                for x in range(n):
                    angle = -2.0 * math.pi * ((kx * x + ky * y) / n)
                    total += field[y * n + x] * complex(math.cos(angle), math.sin(angle))
            output_energy += abs(total) ** 2
    return input_energy, output_energy / (n * n)


def assert_close(name: str, value: float, expected: float, tolerance: float) -> None:
    if abs(value - expected) > tolerance:
        raise AssertionError(f"{name}: expected {expected}, got {value}")
    print(f"PASS {name}: {value:.8g}")


def assert_true(name: str, condition: bool) -> None:
    if not condition:
        raise AssertionError(name)
    print(f"PASS {name}")


def main() -> None:
    sampled = [sample_mode(mode) for mode in MODES]

    for mode in sampled:
        assert_close(f"{mode.name} piston removed", mode.mean, 0.0, 1.5e-3)
        assert_close(f"{mode.name} unit RMS", mode.rms, 1.0, 1.0e-2)

    for i, left in enumerate(sampled):
        for right in sampled[i + 1 :]:
            assert_close(f"{left.name} orthogonal to {right.name}", dot(left, right), 0.0, 2.0e-3)

    assert_close("half gain halves modal RMS", modal_residual(0.18, 0.5), 0.09, 1e-15)
    assert_true("gain outside stable interval rejected", _raises_value_error(lambda: modal_residual(0.18, 1.2)))

    n = 8
    field = []
    for y in range(n):
        for x in range(n):
            phase_waves = 0.03 * math.sqrt(3.0) * (2.0 * (((x + 0.5) / n - 0.5) ** 2 + ((y + 0.5) / n - 0.5) ** 2) - 1.0)
            field.append(complex(math.cos(2.0 * math.pi * phase_waves), math.sin(2.0 * math.pi * phase_waves)))
    input_energy, output_energy = discrete_dft2_energy(field, n)
    assert_close("DFT Parseval energy conservation", output_energy, input_energy, 1e-10)


def _raises_value_error(callback) -> bool:
    try:
        callback()
    except ValueError:
        return True
    return False


if __name__ == "__main__":
    main()
