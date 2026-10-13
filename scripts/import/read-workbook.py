"""Read all nonempty XLSX rows without requiring Excel or third-party packages."""
import json
import sys
import posixpath
import zipfile
import xml.etree.ElementTree as ET

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

with zipfile.ZipFile(sys.argv[1]) as book:
    strings = []
    if "xl/sharedStrings.xml" in book.namelist():
        strings = ["".join(x.itertext()) for x in ET.fromstring(book.read("xl/sharedStrings.xml")).findall("s:si", NS)]
    relationships = {x.attrib["Id"]: x.attrib["Target"] for x in ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))}
    result = []
    for sheet in ET.fromstring(book.read("xl/workbook.xml")).findall("s:sheets/s:sheet", NS):
        target = relationships[sheet.attrib[f"{{{REL}}}id"]]
        path = target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/" + target)
        for row in ET.fromstring(book.read(path)).findall("s:sheetData/s:row", NS):
            cells = {}
            for cell in row.findall("s:c", NS):
                column = "".join(c for c in cell.attrib["r"] if c.isalpha())
                value = cell.findtext("s:v", default="", namespaces=NS)
                if cell.attrib.get("t") == "s":
                    value = strings[int(value)] if value else ""
                elif cell.attrib.get("t") == "inlineStr":
                    value = "".join(cell.find("s:is", NS).itertext())
                cells[column] = value
            if any(cells.values()):
                result.append({"sheet": sheet.attrib["name"], "row": int(row.attrib["r"]), "cells": cells})
    json.dump(result, sys.stdout, ensure_ascii=False)
