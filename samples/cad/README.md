# Sample CAD files for upload testing

Use these files when testing the **Consultant** model upload flow in the Engineering Dashboard.

## Files

| File | Format | Use for |
|------|--------|---------|
| `column-a1-structural.dxf` | AutoCAD DXF | Primary CAD prototype (column plan + rebar circles) |
| `column-a1-structural.pdf` | PDF blueprint | PDF upload test |

## How to test

1. Open http://localhost:3000/login
2. Sign in as **Consultant**: `consultant@eng-njd.local` / `Password123!`
3. In **Submit CAD Model**:
   - **Project:** Jamila
   - **Drawing Title:** `Column A1 Structural` (same title = auto version V2, V3…)
4. Drag & drop one of the files above (or browse)
5. Click **Submit for Review**

## Version control test

Upload the same title twice with different files (or re-upload the same file):

- First upload → `v1`, status `PENDING_REVIEW`
- Second upload → `v2`, previous version → `SUPERSEDED`

Then log in as **Head Engineer** (`head@eng-njd.local`) to approve or reject.

In **Design Reviews**, use **Preview PDF** or **Download CAD** on each pending row (also available in the Approve/Reject modal).

## Accepted extensions (app)

`.dwg`, `.dxf`, `.rvt`, `.pdf`, `.ifc`

Real production drawings would be `.dwg` / `.rvt` from AutoCAD or Revit; these samples are lightweight stand-ins for local/dev testing without licensed BIM software.
