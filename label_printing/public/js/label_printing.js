frappe.provide("label_printing");

label_printing.get_default_printer = async function(frm, row=null) {
    const branch = (row && row.branch) || frm.doc.branch || frm.doc.company_branch || null;
    const warehouse = (row && (row.warehouse || row.set_warehouse || row.t_warehouse || row.s_warehouse)) || frm.doc.set_warehouse || null;
    return await new Promise(resolve => frappe.call({method:"label_printing.api.get_default_printer", args:{branch, warehouse}, callback:r=>resolve(r.message)}));
};

label_printing.get_templates = async function(frm, row=null, printer=null) {
    const source_doctype = frm.doctype;
    printer = printer || await label_printing.get_default_printer(frm, row);
    if (!printer) return [];
    return await new Promise(resolve => frappe.call({method:"frappe.client.get_list",args:{doctype:"Label Template",filters:{source_doctype,status:"Active",printer},fields:["name","template_name","version","label_width_mm","label_height_mm","source_child_table"],order_by:"modified desc",limit_page_length:50},callback:r=>resolve(r.message||[])}));
};

label_printing.get_template = async function(name) {
    return await new Promise((resolve,reject)=>frappe.call({method:"frappe.client.get",args:{doctype:"Label Template",name},callback:r=>r.message?resolve(r.message):reject(new Error(__("Unable to load label template."))),error:reject}));
};

label_printing.get_sample_row = function(frm,row,serial) {
    const sample=Object.assign({},frm.doc||{},row||{});
    if(serial){sample.serial_no=serial;sample.serial_number=serial;}
    return sample;
};

label_printing.resolve_preview_value = function(object,frm,row,serial) {
    if(object.fixed_text) return object.fixed_text;
    const sample=label_printing.get_sample_row(frm,row,serial), fieldname=object.fieldname||"";
    if(!fieldname) return object.object_type==="Text"?__("Sample Text"):__("Sample {0}",[object.object_type||"Object"]);
    const value=sample[fieldname];
    return value===undefined||value===null||value===""?"{{ "+fieldname+" }}":String(value);
};

label_printing.render_template_preview = async function(frm,row,serial,template_name,wrapper) {
    if(!template_name) return;
    const template=await label_printing.get_template(template_name), printer=await label_printing.get_default_printer(frm,row);
    const pw=flt(template.label_width_mm)||50, ph=flt(template.label_height_mm)||30;
    const scale=Math.max(2,Math.min(6,520/Math.max(1,pw)));
    const canvas=$("<div class=\"lp-live-preview-canvas\"></div>").css({width:pw*scale,height:ph*scale});
    wrapper.empty().append(canvas);
    (template.objects||[]).forEach(o=>{
        const type=o.object_type||"Text", el=$("<div class=\"lp-live-preview-object\"></div>"), value=label_printing.resolve_preview_value(o,frm,row,serial);
        el.css({left:flt(o.x_mm)*scale,top:flt(o.y_mm)*scale,width:Math.max(4,flt(o.width_mm||10)*scale),height:Math.max(4,flt(o.height_mm||6)*scale),transform:`rotate(${flt(o.rotation||0)}deg)`,zIndex:flt(o.z_index||0),fontSize:Math.max(7,flt(o.font_size||28)/3)+"px"});
        if(type==="Line") el.addClass("lp-line");
        else if(type==="Rectangle") el.addClass("lp-rectangle");
        else if(type==="DataMatrix"||type==="QR Code") {el.addClass("lp-code");el.html(`<div class="lp-code-pattern"></div><small>${frappe.utils.escape_html(value)}</small>`);}
        else if(type==="Image") el.addClass("lp-image-placeholder").text(__("Image"));
        else el.text(value);
        canvas.append(el);
    });
    wrapper.find(".lp-live-preview-meta").remove();
    wrapper.append(`<div class="lp-live-preview-meta">${__("Template")}: <b>${frappe.utils.escape_html(template.template_name||template.name)}</b> · ${__("Printer")}: ${frappe.utils.escape_html(printer||"-")} · ${pw} × ${ph} mm</div>`);
};

label_printing.open_live_preview = async function(frm,row=null,serial=null,template_name=null) {
    const templates=await label_printing.get_templates(frm,row);
    if(!templates.length) return frappe.msgprint(__("No Active Label Template is configured for this document and printer."));
    template_name=template_name||templates[0].name;
    const options=templates.map(t=>`<option value="${frappe.utils.escape_html(t.name)}">${frappe.utils.escape_html(t.template_name||t.name)}${t.version?" · v"+frappe.utils.escape_html(t.version):""}</option>`).join("");
    const d=new frappe.ui.Dialog({title:__("Label Preview"),size:"extra-large",fields:[{fieldname:"preview",fieldtype:"HTML"}]});
    d.show();
    const wrap=d.fields_dict.preview.$wrapper;
    wrap.html(`<style>.lp-preview-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.lp-preview-head select{min-width:300px;padding:6px;border:1px solid var(--border-color);border-radius:5px;background:var(--control-bg)}.lp-live-preview-wrap{display:flex;justify-content:center;align-items:flex-start;overflow:auto;background:var(--subtle-fg);padding:25px;border-radius:8px;min-height:520px}.lp-live-preview-canvas{position:relative;background:white;box-shadow:0 2px 10px rgba(0,0,0,.18);overflow:hidden}.lp-live-preview-object{position:absolute;box-sizing:border-box;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:2px;text-align:center;line-height:1.1;white-space:normal}.lp-line{border-top:1px solid #222;height:0!important;padding:0}.lp-rectangle{border:1px solid #222}.lp-code{border:1px solid #555;flex-direction:column;font-size:7px}.lp-code-pattern{width:70%;height:70%;background:repeating-conic-gradient(#111 0 25%,#fff 0 50%) 50%/4px 4px}.lp-image-placeholder{border:1px dashed #777;font-size:9px}.lp-live-preview-meta{font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center}</style><div class="lp-preview-head"><label>${__("Print Template")}</label><select class="lp-template-select">${options}</select><span class="text-muted">${__("Preview uses the selected document/item values.")}</span></div><div class="lp-live-preview-wrap"><div class="lp-live-preview"></div></div>`);
    const select=wrap.find(".lp-template-select");select.val(template_name);
    const refresh=()=>label_printing.render_template_preview(frm,row,serial,select.val(),wrap.find(".lp-live-preview"));
    select.on("change",refresh);await refresh();
};

label_printing.print_job = async function(frm,serials,options={}) {
    if(!serials||!serials.length) return frappe.msgprint(__("Select at least one serial number."));
    const row=options.row||null,source_doctype=options.source_doctype||frm.doctype,source_name=options.source_name||frm.doc.name;
    const printer=options.printer||await label_printing.get_default_printer(frm,row);
    if(!printer) return frappe.throw(__("No default label printer is configured for this location."));
    const template=options.template||await new Promise(resolve=>frappe.call({method:"frappe.client.get_list",args:{doctype:"Label Template",filters:{source_doctype,status:"Active",printer},fields:["name"],order_by:"modified desc",limit_page_length:1},callback:r=>resolve((r.message||[])[0]&&r.message[0].name)}));
    if(!template) return frappe.throw(__("No Active Label Template exists for {0} on printer {1}.",[source_doctype,printer]));
    const job=await new Promise((resolve,reject)=>frappe.call({method:"label_printing.print_api.create_print_job",args:{source_doctype,source_name,template,printer,serials,child_table:options.child_table||null,child_row_idx:row?row.idx:null,reprint:!!options.reprint,reprint_reason:options.reprint_reason||null},callback:r=>r.message?resolve(r.message):reject(new Error(__("Unable to create print job."))),error:reject}));
    frappe.show_alert({message:__("Print Job {0} created",[job]),indicator:"green"});await label_printing.execute_job_by_name(job);return job;
};

label_printing.get_serials_from_bundle = function(frm,row) {
    if(!row||!row.serial_and_batch_bundle) return Promise.resolve([]);
    return new Promise(resolve=>frappe.call({method:"frappe.client.get",args:{doctype:"Serial and Batch Bundle",name:row.serial_and_batch_bundle},callback:r=>resolve((r.message&&r.message.entries||[]).filter(e=>e.serial_no).map(e=>e.serial_no))}));
};

// Resolves a row's serial numbers regardless of which ERPNext storage style is
// active: the v15+/v16 default "Serial and Batch Bundle" link, or the legacy
// "Use Serial / Batch Fields" plain-text serial_no column some sites re-enable.
label_printing.get_row_serials = async function(row) {
    if (!row) return [];
    if (row.serial_and_batch_bundle) {
        return await label_printing.get_serials_from_bundle(null, row);
    }
    if (row.serial_no) {
        return String(row.serial_no).split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    }
    return [];
};


// ---------------------------------------------------------------------------
// Generic "Print Label" button framework.
//
// A DocType needs ZERO custom JS to get Print Label buttons: it only needs
// one or more Active Label Templates configured against it (Label Template >
// Parent ERPNext DocType), each naming its own button via "Print Button
// Label". One DocType can carry several active templates/buttons at once
// (e.g. "Print Shipping Label" + "Print Serial Number Label" on the same
// Delivery Note), fully configured from the Label Template list -- no code
// changes needed to add a new label type to a new DocType.
//
// This runs on every document form via the framework's own doctype-agnostic
// "form-refresh" event (NOT frappe.ui.form.on("*", ...), which does not
// exist / does not fire in Frappe -- form-refresh is the real mechanism the
// framework itself fires on every render_form regardless of doctype).
// ---------------------------------------------------------------------------

label_printing.resolve_row_identities = async function(row) {
    const serials = await label_printing.get_row_serials(row);
    if (serials.length) return serials;
    // Generic fallback for child tables with no serial/batch tracking at all:
    // one label per row, identified by the row's own unique name.
    return row && row.name ? [row.name] : [];
};

label_printing.print_via_row_template = async function(frm, template) {
    const child_table = template.source_child_table;
    const rows = frm.doc[child_table] || [];
    if (!rows.length) return frappe.msgprint(__("{0} has no rows to print labels for.", [child_table]));

    const choices = [];
    for (const row of rows) {
        const ids = await label_printing.resolve_row_identities(row);
        ids.forEach(id => choices.push({ id, row }));
    }
    if (!choices.length) {
        return frappe.msgprint(__("Nothing found to print. Make sure serial numbers are set on this document."));
    }

    const d = new frappe.ui.Dialog({
        title: template.print_button_label || __("Print Labels"),
        size: "large",
        fields: [{
            fieldname: "ids", fieldtype: "MultiCheck",
            label: __("Select what to print"),
            options: choices.map(c => c.id), columns: 2,
        }],
        primary_action_label: __("Print"),
        primary_action: async (values) => {
            const selected = new Set(values.ids || []);
            if (!selected.size) return frappe.msgprint(__("Select at least one."));
            const by_row = {};
            choices.forEach(c => {
                if (!selected.has(c.id)) return;
                (by_row[c.row.idx] = by_row[c.row.idx] || { row: c.row, ids: [] }).ids.push(c.id);
            });
            d.hide();
            for (const key of Object.keys(by_row)) {
                const group = by_row[key];
                await label_printing.print_job(frm, group.ids, {
                    row: group.row, child_table, template: template.name, printer: template.printer,
                });
            }
        },
    });
    d.show();
};

label_printing.print_via_document_template = async function(frm, template) {
    const d = new frappe.ui.Dialog({
        title: template.print_button_label || __("Print Label"),
        fields: [{
            fieldname: "copies", fieldtype: "Int", label: __("Number of Labels"),
            default: 1, reqd: 1,
            description: __("More than 1 prints {0}-1, {0}-2 ... as separate labels (e.g. multiple cartons/pallets).", [frm.doc.name]),
        }],
        primary_action_label: __("Print"),
        primary_action: async (values) => {
            const n = Math.max(1, cint(values.copies) || 1);
            const ids = n === 1 ? [frm.doc.name] : Array.from({ length: n }, (_, i) => `${frm.doc.name}-${i + 1}`);
            d.hide();
            await label_printing.print_job(frm, ids, { template: template.name, printer: template.printer });
        },
    });
    d.show();
};

label_printing.open_reprint_dialog = async function(frm) {
    const is_serial_doctype = frm.doctype === "Serial No";
    const candidates = is_serial_doctype ? [] : await new Promise(resolve => frappe.call({
        method: "label_printing.api.get_reprint_candidates",
        args: { source_doctype: frm.doctype, source_name: frm.doc.name },
        callback: r => resolve(r.message || []),
    }));

    const fields = [];
    if (is_serial_doctype) {
        fields.push({ fieldname: "serial_no", fieldtype: "Data", label: __("Label / Serial Number"), default: frm.doc.name, read_only: 1, reqd: 1 });
    } else if (candidates.length) {
        fields.push({ fieldname: "serial_no", fieldtype: "Select", label: __("Label / Serial Number"), options: candidates, reqd: 1 });
    } else {
        fields.push({
            fieldname: "serial_no", fieldtype: "Data", label: __("Label / Serial Number"), reqd: 1,
            description: __("No earlier print was found for this document yet. Enter the exact serial / label identity that was printed."),
        });
    }
    fields.push({ fieldname: "reason", fieldtype: "Small Text", label: __("Reason"), reqd: 1 });

    const d = new frappe.ui.Dialog({
        title: __("Reprint / Damaged Label"),
        fields,
        primary_action_label: __("Reprint"),
        primary_action: async (values) => {
            let source;
            try {
                source = await new Promise((resolve, reject) => frappe.call({
                    method: "label_printing.print_api.find_reprint_source",
                    args: { serial_no: values.serial_no },
                    callback: r => r.message ? resolve(r.message) : reject(new Error(__("No earlier print found for this label."))),
                    error: reject,
                }));
            } catch (e) {
                return frappe.msgprint(e.message);
            }
            d.hide();
            await label_printing.print_job(frm, [values.serial_no], {
                source_doctype: source.source_doctype, source_name: source.source_name,
                template: source.template, printer: source.printer,
                reprint: true, reprint_reason: values.reason,
            });
        },
    });
    d.show();
};

label_printing.setup_print_buttons = async function(frm) {
    if (!frm || frm.is_new()) return;
    const meta = frappe.get_meta(frm.doctype);
    if (!meta || meta.istable) return;
    if (meta.is_submittable && frm.doc.docstatus !== 1) return;

    let templates = [];
    try {
        templates = await new Promise(resolve => frappe.call({
            method: "label_printing.api.get_print_buttons",
            args: { doctype: frm.doctype },
            callback: r => resolve(r.message || []),
        }));
    } catch (e) {
        templates = [];
    }

    templates.forEach(template => {
        frm.add_custom_button(template.print_button_label || template.name, () => {
            if (template.source_child_table) label_printing.print_via_row_template(frm, template);
            else label_printing.print_via_document_template(frm, template);
        }, __("Labels"));
    });

    if (frm.doctype === "Serial No" || templates.length) {
        frm.add_custom_button(__("Reprint / Damaged Label"), () => label_printing.open_reprint_dialog(frm), __("Labels"));
    }

    // Row-level quick-print button per template bound to a child table.
    templates.filter(t => t.source_child_table).forEach(template => {
        const field = frm.fields_dict[template.source_child_table];
        const grid = field && field.grid;
        if (!grid) return;
        const flag = "__lp_bound_" + template.name;
        if (grid[flag]) return;
        grid[flag] = true;
        grid.wrapper.on("grid-row-render." + flag, function (e, grid_row) {
            const row = grid_row && grid_row.doc;
            const cls = "lp-row-btn-" + template.name;
            if (!row || grid_row.row.find("." + cls).length) return;
            const button = $(`<button type="button" class="btn btn-xs btn-default ${cls}" style="margin:2px">${frappe.utils.escape_html(template.print_button_label || __("Print"))}</button>`);
            button.on("click", async (ev) => {
                ev.stopPropagation();
                const ids = await label_printing.resolve_row_identities(row);
                if (!ids.length) return frappe.msgprint(__("Nothing to print for row {0}.", [row.idx]));
                await label_printing.print_job(frm, ids, {
                    row, child_table: template.source_child_table, template: template.name, printer: template.printer,
                });
            });
            grid_row.row.find(".grid-static-col:last").append(button);
        });
    });
};

$(document).on("form-refresh", function (e, frm) {
    label_printing.setup_print_buttons(frm);
});
