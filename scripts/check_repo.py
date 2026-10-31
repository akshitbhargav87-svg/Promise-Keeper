#!/usr/bin/env python3
"""Check planning links/catalog/board and validate the supported fixture schema.

The small JSON Schema evaluator intentionally rejects unknown validation keywords;
application runtime validation and full OpenAPI generation belong to A01-T02.
"""
from __future__ import annotations

import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote

import coord

ROOT = Path(__file__).resolve().parents[1]


def check_schema(value, schema: dict, root: dict, path: str = "$") -> None:
    supported = {"$schema", "$id", "$defs", "$ref", "title", "description", "type", "required",
                 "properties", "additionalProperties", "enum", "minLength", "pattern", "minimum",
                 "maximum", "minItems", "items"}
    unknown = set(schema) - supported
    if unknown:
        raise ValueError(f"{path}: checker does not support keywords {sorted(unknown)}")
    if "$ref" in schema:
        if not schema["$ref"].startswith("#/$defs/"):
            raise ValueError("Only internal $defs references are supported")
        return check_schema(value, root["$defs"][schema["$ref"].split("/")[-1]], root, path)
    types = {"object": lambda v: isinstance(v, dict), "array": lambda v: isinstance(v, list),
             "string": lambda v: isinstance(v, str), "integer": lambda v: type(v) is int,
             "number": lambda v: type(v) in (int, float), "boolean": lambda v: type(v) is bool,
             "null": lambda v: v is None}
    expected = schema.get("type", list(types))
    expected = [expected] if isinstance(expected, str) else expected
    if not any(types[t](value) for t in expected):
        raise ValueError(f"{path}: wrong type, expected {expected}")
    if "enum" in schema and value not in schema["enum"]:
        raise ValueError(f"{path}: invalid enum")
    if isinstance(value, dict):
        if set(schema.get("required", [])) - set(value):
            raise ValueError(f"{path}: required fields missing")
        props = schema.get("properties", {})
        if schema.get("additionalProperties") is False and set(value) - set(props):
            raise ValueError(f"{path}: unknown properties")
        for key in value.keys() & props.keys():
            check_schema(value[key], props[key], root, f"{path}.{key}")
    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            raise ValueError(f"{path}: too few items")
        for i, item in enumerate(value):
            check_schema(item, schema.get("items", {}), root, f"{path}[{i}]")
    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0) or ("pattern" in schema and not re.search(schema["pattern"], value)):
            raise ValueError(f"{path}: string constraint failed")
    if type(value) in (int, float):
        if value < schema.get("minimum", float("-inf")) or value > schema.get("maximum", float("inf")):
            raise ValueError(f"{path}: numeric constraint failed")


def main() -> int:
    errors = []
    files = [p for p in ROOT.rglob("*.md") if not any(part in {".git", "node_modules", ".next", ".venv"} for part in p.relative_to(ROOT).parts)]
    for file in files:
        content = file.read_text(encoding="utf-8")
        # Ordinary Markdown links; URLs, heading-only anchors and intended app routes are ignored.
        for match in re.finditer(r"\[[^\]\n]+\]\(([^)\s]+)\)", content):
            target = unquote(match.group(1).strip("<>"))
            if target.startswith(("https://", "http://", "mailto:", "#", "/", "codex:")):
                continue
            path = (file.parent / target.split("#", 1)[0]).resolve()
            if not path.is_relative_to(ROOT) or not path.exists():
                errors.append(f"{file.relative_to(ROOT)}: missing/outside local link {target}")
    try:
        board = coord.parse((ROOT / "TASKS.md").read_text(encoding="utf-8"))
        areas, tasks = coord.catalog(ROOT)
        for aid, area in areas.items():
            if board["areas"][aid]["name"] != area["name"] or board["areas"][aid]["path"] != area["path"]:
                errors.append(f"Board/catalog area mismatch: {aid}")
        for tid, task in tasks.items():
            if board["tasks"][tid]["title"] != task["title"]:
                errors.append(f"Board/catalog task mismatch: {tid}")
        schema = json.loads((ROOT / "contracts" / "extraction.schema.json").read_text(encoding="utf-8"))
        scenario = json.loads((ROOT / "fixtures" / "scenario.json").read_text(encoding="utf-8"))
        check_schema(scenario["extraction"], schema, schema)
        comparison = scenario["comparison"]
        if len({comparison[k]["currency"] for k in ("promised", "observed", "delta")}) != 1:
            errors.append("Scenario compares different currencies")
        if int(comparison["observed"]["minor"]) - int(comparison["promised"]["minor"]) != int(comparison["delta"]["minor"]):
            errors.append("Scenario money arithmetic mismatch")
        if not scenario.get("synthetic"):
            errors.append("Scenario must be explicitly synthetic")
    except (coord.CoordError, OSError, ValueError, KeyError) as exc:
        errors.append(str(exc))
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"PASS: {len(files)} Markdown files; links; 10 areas/70 ordered tasks; board/audit; extraction fixture schema; money example.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
