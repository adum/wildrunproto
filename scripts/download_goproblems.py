#!/usr/bin/env python3
import argparse
import json
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

API_URL = "https://goproblems.com/api/v2/problems/{}"


def fetch_problem(problem_id):
    url = API_URL.format(problem_id)
    req = Request(url, headers={"User-Agent": "wr_codex-prototype/0.1"})
    try:
        with urlopen(req) as resp:
            if resp.status == 404:
                return None, "not_found"
            if resp.status != 200:
                return None, f"status_{resp.status}"
            return json.load(resp), None
    except HTTPError as err:
        if err.code == 404:
            return None, "not_found"
        return None, f"http_error_{err.code}"
    except URLError as err:
        return None, f"url_error_{err.reason}"


def is_eligible(problem):
    if not problem.get("alive"):
        return False, "not_alive"
    if problem.get("sandbox"):
        return False, "sandbox"
    if not problem.get("isCanon"):
        return False, "not_canon"
    if not problem.get("sgf"):
        return False, "missing_sgf"
    return True, ""


def difficulty_label(problem):
    rank = problem.get("rank") or {}
    value = rank.get("value")
    unit = rank.get("unit")
    if value is not None and unit:
        unit = str(unit).lower()
        suffix = "kyu" if unit == "kyu" else "dan" if unit == "dan" else unit
        if isinstance(value, float) and value.is_integer():
            value = int(value)
        return f"{value}{suffix}"

    level = problem.get("problemLevel")
    if level is not None:
        if isinstance(level, float) and level.is_integer():
            level = int(level)
        return str(level)

    return "unknown"


def safe_label(label):
    label = str(label).replace(".", "p")
    label = re.sub(r"[^A-Za-z0-9]+", "", label)
    return label or "unknown"


def save_problem(problem, output_dir):
    difficulty = safe_label(difficulty_label(problem))
    problem_id = problem.get("id")
    filename = f"{difficulty}_{problem_id}.sgf"
    path = output_dir / filename
    path.write_text(problem["sgf"], encoding="utf-8")
    return path


def main():
    parser = argparse.ArgumentParser(
        description="Download GoProblems SGFs into ./gp"
    )
    parser.add_argument(
        "--count",
        type=int,
        default=1,
        help="Number of valid problems to download (default: 1)",
    )
    parser.add_argument(
        "--start-id",
        type=int,
        default=1,
        help="Problem ID to start at (default: 1)",
    )
    args = parser.parse_args()

    if args.count < 1:
        raise SystemExit("count must be >= 1")
    if args.start_id < 1:
        raise SystemExit("start-id must be >= 1")

    output_dir = Path("gp")
    output_dir.mkdir(parents=True, exist_ok=True)

    saved = 0
    current_id = args.start_id

    while saved < args.count:
        problem, err = fetch_problem(current_id)
        if err == "not_found":
            print(f"{current_id}: 404 not found")
            current_id += 1
            continue
        if err:
            print(f"{current_id}: fetch failed ({err})")
            current_id += 1
            continue

        ok, reason = is_eligible(problem)
        if not ok:
            print(f"{current_id}: skipped ({reason})")
            current_id += 1
            continue

        path = save_problem(problem, output_dir)
        print(f"{current_id}: saved {path}")
        saved += 1
        current_id += 1


if __name__ == "__main__":
    main()
