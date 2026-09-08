frappe.ui.form.on("Label Template", {
    refresh(frm) {
        if (!frm.is_new()) {
            frm.add_custom_button(__("Open Designer"), () => label_printing.open_designer(frm), __("Design"));
            frm.add_custom_button(__("Validate Layout"), () => label_printing.validate_layout(frm), __("Design"));
        }
    },
    source_doctype(frm) {
        frm.set_value("source_child_table", "");
        label_printing.load_child_tables(frm);
    },
    printer(frm) {
        if (!frm.doc.printer) return;
        frappe.db.get_value("Manage Printer", frm.doc.printer, ["label_width_mm", "label_height_mm"], r => {
            if (r.message) {
                frm.set_value("label_width_mm", r.message.label_width_mm || 0);
                frm.set_value("label_height_mm", r.message.label_height_mm || 0);
            }
        });
    }
});

label_printing.load_child_tables = function(frm) {
    if (!frm.doc.source_doctype) return;
    frappe.call({
        method: "label_printing.api.get_child_tables",
        args: {doctype: frm.doc.source_doctype},
        callback(r) {
            const options = [""].concat((r.message || []).map(x => x.value));
            frm.set_df_property("source_child_table", "options", options.join("\n"));
            frm.refresh_field("source_child_table");
        }
    });
};

label_printing.validate_layout = function(frm) {
    const w = flt(frm.doc.label_width_mm), h = flt(frm.doc.label_height_mm);
    const errors = [];
    (frm.doc.objects || []).forEach((o, i) => {
        if (flt(o.x_mm) < 0 || flt(o.y_mm) < 0) errors.push(__("Object {0}: X/Y cannot be negative.", [i + 1]));
        if (flt(o.x_mm) + flt(o.width_mm) > w || flt(o.y_mm) + flt(o.height_mm) > h) errors.push(__("Object {0}: outside label bounds.", [i + 1]));
        if (["DataMatrix", "QR Code"].includes(o.object_type) && flt(o.width_mm) < 8) errors.push(__("Object {0}: 2D code is very small.", [i + 1]));
        if (["Text", "DataMatrix", "QR Code"].includes(o.object_type) && !o.fieldname && !o.fixed_text) errors.push(__("Object {0}: map a field or enter fixed text.", [i + 1]));
    });
    frappe.msgprint({title: errors.length ? __("Layout Warnings") : __("Layout Valid"), indicator: errors.length ? "orange" : "green", message: errors.length ? errors.join("<br>") : __("No obvious layout errors were found.")});
};

label_printing.open_designer = function(frm) {
    if (!frm.doc.source_doctype || !frm.doc.printer) {
        frappe.msgprint(__("Select ERPNext DocType and Printer before opening the designer."));
        return;
    }

    const d = new frappe.ui.Dialog({
        title: __("Label Template Designer"),
        size: "extra-large",
        fields: [{fieldname: "designer", fieldtype: "HTML"}],
        primary_action_label: __("Save Template"),
        primary_action() {
            label_printing.validate_layout(frm);
            frm.dirty();
            frm.save().then(() => d.hide());
        }
    });
    d.show();

    const wrap = d.fields_dict.designer.$wrapper;
    wrap.html(`
        <style>
        .lpd{display:grid;grid-template-columns:290px minmax(420px,1fr);gap:16px;min-height:620px}
        .lpd-panel{border:1px solid var(--border-color);border-radius:8px;padding:14px;background:var(--card-bg)}
        .lpd-title{font-weight:600;margin-bottom:10px}.lpd-actions{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
        .lpd-list{max-height:190px;overflow:auto;border:1px solid var(--border-color);border-radius:6px;margin-bottom:12px}
        .lpd-item{padding:8px 10px;border-bottom:1px solid var(--border-color);cursor:pointer}.lpd-item:last-child{border-bottom:0}.lpd-item.active{background:var(--control-bg);font-weight:600}
        .lpd-field{margin-bottom:8px}.lpd-field label{display:block;font-size:11px;color:var(--text-muted);margin-bottom:3px}.lpd-field input,.lpd-field select{width:100%;padding:5px 7px;border:1px solid var(--border-color);border-radius:5px;background:var(--control-bg)}
        .lpd-preview-wrap{display:flex;justify-content:center;align-items:flex-start;overflow:auto;background:var(--subtle-fg);padding:25px;border-radius:8px;min-height:580px}
        .lpd-canvas{position:relative;background:white;box-shadow:0 2px 10px rgba(0,0,0,.18);background-image:linear-gradient(#eee 1px,transparent 1px),linear-gradient(90deg,#eee 1px,transparent 1px);background-size:10px 10px}
        .lpd-object{position:absolute;border:1px dashed #777;overflow:hidden;box-sizing:border-box;cursor:pointer;background:rgba(255,255,255,.7);font-size:10px;padding:2px;white-space:nowrap}
        .lpd-object.active{border:2px solid var(--primary-color)}.lpd-help{font-size:11px;color:var(--text-muted);margin-top:8px}
        </style>
        <div class="lpd">
          <div class="lpd-panel">
            <div class="lpd-title">${__("Objects")}</div>
            <div class="lpd-actions">
              <button class="btn btn-xs btn-default" data-add="Text">+ Text</button>
              <button class="btn btn-xs btn-default" data-add="DataMatrix">+ DataMatrix</button>
              <button class="btn btn-xs btn-default" data-add="QR Code">+ QR</button>
              <button class="btn btn-xs btn-default" data-add="Line">+ Line</button>
              <button class="btn btn-xs btn-default" data-add="Rectangle">+ Box</button>
              <button class="btn btn-xs btn-danger" data-delete="1">Delete</button>
            </div>
            <div class="lpd-list"></div>
            <div class="lpd-title">${__("Selected Object")}</div>
            <div class="lpd-properties"></div>
            <div class="lpd-help">${__("Change any property and the preview updates immediately. ERPNext fields are loaded from the selected document and item table.")}</div>
          </div>
          <div class="lpd-panel"><div class="lpd-title">${__("Live Preview")}</div><div class="lpd-preview-wrap"><div class="lpd-canvas"></div></div></div>
        </div>`);

    let selected = 0;
    let fieldOptions = [];

    function loadFields() {
        frappe.call({method:"label_printing.api.get_doctype_fields", args:{doctype:frm.doc.source_doctype, child_table:frm.doc.source_child_table || null}, callback(r){
            fieldOptions = r.message || [];
            renderAll();
        }});
    }

    function labelText(o) {
        if (o.object_type === "Text") return o.fixed_text || o.fieldname || "Text";
        return o.object_type;
    }

    function renderAll() {
        const scale = Math.max(2, Math.min(5, 520 / Math.max(1, flt(frm.doc.label_width_mm))));
        const cw = Math.max(220, flt(frm.doc.label_width_mm) * scale);
        const ch = Math.max(120, flt(frm.doc.label_height_mm) * scale);
        wrap.find(".lpd-canvas").css({width:cw, height:ch});
        const list = wrap.find(".lpd-list").empty();
        (frm.doc.objects || []).forEach((o,i) => list.append(`<div class="lpd-item ${i===selected?'active':''}" data-index="${i}">${i+1}. ${frappe.utils.escape_html(labelText(o))}</div>`));
        const canvas = wrap.find(".lpd-canvas").empty();
        (frm.doc.objects || []).forEach((o,i) => {
            const el = $(`<div class="lpd-object ${i===selected?'active':''}"></div>`);
            el.css({left:flt(o.x_mm)*scale,top:flt(o.y_mm)*scale,width:Math.max(8,flt(o.width_mm||10)*scale),height:Math.max(8,flt(o.height_mm||6)*scale)});
            el.text(labelText(o));
            el.on("click",()=>{selected=i;renderAll();});
            canvas.append(el);
        });
        renderProperties();
    }

    function renderProperties() {
        const box = wrap.find(".lpd-properties").empty();
        const o = frm.doc.objects[selected];
        if (!o) {box.html(`<div class="text-muted">${__("Add an object to begin.")}</div>`);return;}
        const fieldSelect = fieldOptions.map(f=>`<option value="${frappe.utils.escape_html(f.value)}" ${f.value===o.fieldname?'selected':''}>${frappe.utils.escape_html((f.group?f.group+" · ":"")+f.label)}</option>`).join("");
        box.html(`
          <div class="lpd-field"><label>Object Type</label><select data-p="object_type"><option>Text</option><option>DataMatrix</option><option>QR Code</option><option>Image</option><option>Line</option><option>Rectangle</option></select></div>
          <div class="lpd-field"><label>ERPNext Field</label><select data-p="fieldname"><option value="">-- Fixed Text --</option>${fieldSelect}</select></div>
          <div class="lpd-field"><label>Fixed Text</label><input data-p="fixed_text" value="${frappe.utils.escape_html(o.fixed_text||"")}"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div class="lpd-field"><label>X (mm)</label><input type="number" step="0.1" data-p="x_mm" value="${o.x_mm||0}"></div>
            <div class="lpd-field"><label>Y (mm)</label><input type="number" step="0.1" data-p="y_mm" value="${o.y_mm||0}"></div>
            <div class="lpd-field"><label>Width (mm)</label><input type="number" step="0.1" data-p="width_mm" value="${o.width_mm||10}"></div>
            <div class="lpd-field"><label>Height (mm)</label><input type="number" step="0.1" data-p="height_mm" value="${o.height_mm||6}"></div>
            <div class="lpd-field"><label>Rotation</label><select data-p="rotation"><option>0</option><option>90</option><option>180</option><option>270</option></select></div>
            <div class="lpd-field"><label>Font Size</label><input type="number" data-p="font_size" value="${o.font_size||28}"></div>
          </div>`);
        box.find('[data-p="object_type"]').val(o.object_type||"Text");
        box.find('[data-p="rotation"]').val(o.rotation||"0");
        box.find("[data-p]").on("input change", function(){
            const p=$(this).data("p");
            o[p] = $(this).val();
            if(["x_mm","y_mm","width_mm","height_mm","font_size","data_matrix_scale","z_index"].includes(p)) o[p]=flt(o[p]);
            frm.dirty(); renderAll();
        });
    }

    wrap.on("click","[data-add]",function(){
        const type=$(this).data("add");
        frm.add_child("objects",{object_type:type,x_mm:2,y_mm:2,width_mm:type==="Text"?35:15,height_mm:type==="Text"?6:15,font_size:28,data_matrix_scale:5,fixed_text:type==="Text"?"":""});
        selected=(frm.doc.objects||[]).length-1;frm.dirty();renderAll();
    });
    wrap.on("click","[data-delete]",function(){
        if (!frm.doc.objects[selected]) return;
        frm.doc.objects.splice(selected,1); selected=Math.max(0,selected-1); frm.dirty(); renderAll();
    });
    wrap.on("click",".lpd-item",function(){selected=Number($(this).data("index"));renderAll();});
    loadFields();
};
