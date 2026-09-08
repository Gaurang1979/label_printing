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

label_printing.print_item_row = async function(frm,row,child_table) {
    const serials=await label_printing.get_serials_from_bundle(frm,row);
    if(!serials.length) return frappe.msgprint(__("No serial numbers were found for item row {0}.",[row.idx]));
    return label_printing.print_job(frm,serials,{row,child_table});
};
