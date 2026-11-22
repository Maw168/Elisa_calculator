# ELISA plate calculator

A browser page for turning ELISA concentration values (e.g. pg/ml from the plate reader software) into biological-replicate values, summary statistics, a bar chart, and Prism/Excel exports. Everything runs in your browser — no data is uploaded.

## Install and run

Requires Node.js 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

To build a standalone copy:

```bash
npm run build
```

This writes `dist/`. Serve it with `npm run preview`, or put the `dist/` folder on any static web host.

Other commands: `npm test` (unit tests), `npm run lint`.

## How to use

1. **Load plate values**
   - Copy the 8 x 12 concentration block from Excel (with or without the `<>` / `1..12` / `A..H` headers) and paste it into the text box, then click **Load pasted data**; or
   - open the reader's `.xlsx` export, pick the plate block from the previews (the concentration block is preselected), and click **Use this block**.
   - Blank cells and text such as `NoCalc` are treated as missing values.
2. **Assign wells**
   - Drag over wells to select them (Shift/Cmd/Ctrl adds to the selection; clicking a row letter or column number selects the whole line).
   - Type a **condition** (e.g. `E+s+p api`) and a **biological replicate #**, then click **Apply**. Wells with the same condition and the same bio number are averaged as technical replicates — any number of wells, in any position.
   - **Clear** removes the assignment from the selected wells.
   - **Exclude** / **Restore** (or double-click a well) leaves an outlier out of the calculation while keeping its assignment.
   - If two condition names differ only in letter case or spacing, a warning offers to merge them. Nothing is merged automatically. If their dilutions differ, the warning shows both and which one the merged condition keeps.
   - **Conditions & dilution** lists every assigned condition with its color. Enter each condition's sample dilution as `1:500` (or just `500`); leave it empty to use the **Default** dilution at the bottom. A condition's dilution is remembered by name, so clearing its wells and assigning the same name again brings it back.
3. **Results**
   - Set the input/output units (pg/ml, ng/ml, ug/ml). Value = technical mean x the condition's dilution, converted to the output unit.
   - The table has one column per condition (Prism Column layout), one row per biological replicate, plus mean, SD (n-1), SEM and n. Use ‹ › in a column header to reorder conditions; the chart and exports follow the same order.
   - Choose **SD** or **SEM** for the chart's error bars.
4. **Export**
   - **Copy for Prism** copies the biological-replicate values as tab-separated text. Paste it into the first cell of a Prism *Column* data table. If the browser blocks the clipboard, a text box appears so you can copy it by hand.
   - **Download Excel** saves a workbook with the sheets:
     - `Layout`: a color-coded plate map (condition, bio replicate and value in each well, excluded wells struck through) with a legend of conditions, colors and dilutions, plus the source, export date, units and default dilution. Print it or keep it as the lab record of the experiment.
     - `Plate`: values, assignments, excluded wells.
     - `Replicates`: every technical-replicate group with its wells, means and dilution.
     - `Results`: the table plus each condition's dilution, the default dilution and the units used.
   - **Download PNG** saves the chart.
5. **Templates**
   - **Save** stores the current assignments, settings (including the default and per-condition dilutions) and condition order under a name. **Apply** puts them onto the plate that is loaded now. It does not change the values or the excluded wells.
   - Templates are kept in this browser. Use **Export templates** / **Import templates** to back them up or move them to another computer.

## Example

`src/__fixtures__/reference.xlsx` is a real plate export used by the tests. With its concentration block, the layout described in the tests, default dilution 1:500 and output ng/ml, the results match the hand-calculated values in that workbook (cells D48:K50).
