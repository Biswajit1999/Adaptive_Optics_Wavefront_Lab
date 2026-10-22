#!/usr/bin/env python3
"""Generate reviewable, printable HTML from the committed report sources."""
from pathlib import Path
from html import escape
import markdown

ROOT = Path(__file__).resolve().parents[1]
PAGES = [
    ("PROJECT_REPORT.md", "report.html", "Project report"),
    ("PROJECT_SUMMARY.md", "summary.html", "Project at a glance"),
]

def main():
    for source, destination, title in PAGES:
        md = markdown.Markdown(extensions=["tables", "fenced_code", "toc"])
        body = md.convert((ROOT / source).read_text(encoding="utf-8"))
        html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="{escape(title)}: motivation, pipeline, validated results and limits of Biswajit Jana's adaptive optics learning project.">
<title>{escape(title)} — Adaptive Optics Wavefront Lab</title>
<link rel="icon" href="assets/favicon.svg">
<link rel="stylesheet" href="assets/css/research.css?v=20261022.1">
<link rel="canonical" href="https://biswajit1999.github.io/Adaptive_Optics_Wavefront_Lab/{destination}">
</head><body>
<a class="skip" href="#report">Skip to report</a>
<header class="site-header"><a class="wordmark" href="index.html"><span class="mark">AO</span> Wavefront Lab</a><nav aria-label="Project"><a href="index.html">Overview</a><a href="report.html">Report</a><a href="summary.html">Project at a glance</a><a href="lab.html">Open lab ↗</a></nav></header>
<main class="report-shell"><nav class="report-toc" aria-label="Document contents"><strong>In this document</strong>{md.toc}</nav>
<article class="report-body" id="report"><details class="mobile-toc"><summary>Document contents</summary>{md.toc}</details><div class="report-tools"><button type="button" onclick="window.print()">Print / save as PDF</button><a href="{source}">Markdown source</a><a href="https://github.com/Biswajit1999/Adaptive_Optics_Wavefront_Lab">Repository</a></div>
{body}
</article></main>
<footer class="site-footer">Biswajit Jana · AO telemetry and learning project · Generated from the committed Markdown source.</footer>
</body></html>
"""
        with (ROOT / destination).open("w", encoding="utf-8", newline="\n") as output:
            output.write(html)
        print(f"Built {destination} from {source}")

if __name__ == "__main__":
    main()
