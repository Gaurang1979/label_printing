frappe.provide("label_printing");

// Shared helpers used by the Print Label page (see page/print_label) and by
// Label Print Job's own buttons. Native ERPNext DocTypes are deliberately
// left untouched -- there is no per-doctype button injection here; all
// printing happens through the dedicated Print Label tool.

label_printing.get_default_printer = async function(frm, row=null) {
    const branch = (row && row.branch) || (frm && frm.doc.branch) || (frm && frm.doc.company_branch) || null;
    const warehouse = (row && (row.warehouse || row.set_warehouse || row.t_warehouse || row.s_warehouse)) || (frm && frm.doc.set_warehouse) || null;
    return await new Promise(resolve => frappe.call({method:"label_printing.api.get_default_printer", args:{branch, warehouse}, callback:r=>resolve(r.message)}));
};

label_printing.print_job = async function(frm,serials,options={}) {
    if(!serials||!serials.length) return frappe.msgprint(__("Select at least one serial number."));
    const row=options.row||null,source_doctype=options.source_doctype||(frm&&frm.doctype),source_name=options.source_name||(frm&&frm.doc.name);
    const printer=options.printer||await label_printing.get_default_printer(frm,row);
    if(!printer) return frappe.throw(__("No default label printer is configured for this location."));
    const template=options.template||await new Promise(resolve=>frappe.call({method:"frappe.client.get_list",args:{doctype:"Label Template",filters:{source_doctype,status:"Active",printer},fields:["name"],order_by:"modified desc",limit_page_length:1},callback:r=>resolve((r.message||[])[0]&&r.message[0].name)}));
    if(!template) return frappe.throw(__("No Active Label Template exists for {0} on printer {1}.",[source_doctype,printer]));

    if (!options.reprint) {
        const existing = await new Promise(resolve => frappe.call({
            method: "label_printing.print_api.find_open_job",
            args: {source_doctype, source_name, template},
            callback: r => resolve(r.message || null),
        }));
        if (existing) {
            const resume = await new Promise(resolve => frappe.confirm(
                __("There is an unfinished print job for this document with this template ({0}). Resume printing the remaining labels instead of starting a new job?", [existing]),
                () => resolve(true), () => resolve(false)
            ));
            if (resume) return label_printing.execute_job_by_name(existing, frm);
        }
    }

    const job=await new Promise((resolve,reject)=>frappe.call({method:"label_printing.print_api.create_print_job",args:{source_doctype,source_name,template,printer,serials,child_table:options.child_table||null,child_row_idx:row?row.idx:null,reprint:!!options.reprint,reprint_reason:options.reprint_reason||null},callback:r=>r.message?resolve(r.message):reject(new Error(__("Unable to create print job."))),error:reject}));
    frappe.show_alert({message:__("Print Job {0} created",[job]),indicator:"green"});await label_printing.execute_job_by_name(job);return job;
};

// Sends every Pending/Failed/Paused item in a job through Zebra Browser
// Print, marking each as printed/failed as it goes. Safe to call again on
// the same job at any time -- it always picks up only what's left, so a
// printer running out of stock or losing connection mid-batch never causes
// re-printed duplicates; the next call (from the same Print button on the
// Print Label page, or "Print / Resume" on the job itself) simply
// continues from there.
label_printing.execute_job_by_name = async function(job_name, frm=null) {
    if (!label_printing.browser_print.available()) {
        return frappe.msgprint(__("Zebra Browser Print is not detected. Install/start it on this workstation."));
    }
    const job = await frappe.call({method:"frappe.client.get", args:{doctype:"Label Print Job", name:job_name}}).then(r=>r.message);
    if (!job) return;
    const printer = await frappe.call({method:"label_printing.api.get_printer", args:{printer:job.printer}}).then(r=>r.message);
    return new Promise(resolve => label_printing.browser_print.init(async () => {
        const rows = (job.items || []).filter(r => ["Pending","Failed","Paused"].includes(r.status));
        for (const row of rows) {
            try {
                const zpl = await frappe.call({method:"label_printing.print_api.get_label_zpl", args:{job:job.name, serial_no:row.serial_no}}).then(r=>r.message);
                await new Promise((res,rej) => label_printing.browser_print.sendToConfiguredPrinter(printer.browser_print_name, zpl, err => err ? rej(err) : res()));
                await frappe.call({method:"label_printing.print_api.mark_printed", args:{job:job.name, serial_no:row.serial_no}});
            } catch (e) {
                await frappe.call({method:"label_printing.print_api.mark_failed", args:{job:job.name, serial_no:row.serial_no, error_message:String(e)}});
                frappe.msgprint(__("Printing stopped at serial {0}. Fix the printer and try again (or use Print / Resume on Label Print Job {1}) to continue with what's left.",[row.serial_no, job.name]));
                break;
            }
        }
        if (frm) await frm.reload_doc();
        else frappe.show_alert({message:__("Label print job processed"),indicator:"green"});
        resolve();
    }));
};

label_printing.preview_pending = async function(frm) {
    const row = (frm.doc.items || []).find(r => ["Pending","Failed","Paused"].includes(r.status));
    if (!row) return frappe.msgprint(__("There are no pending labels."));
    const r = await frappe.call({method:"label_printing.print_api.get_label_zpl", args:{job:frm.doc.name, serial_no:row.serial_no}});
    const d = new frappe.ui.Dialog({title:__("ZPL Preview - {0}",[row.serial_no]), fields:[{fieldname:"zpl",fieldtype:"Code",options:"Text",read_only:1}], primary_action_label:__("Close"), primary_action(){d.hide();}});
    d.set_value("zpl", r.message || ""); d.show();
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

label_printing.resolve_row_identities = async function(row) {
    const serials = await label_printing.get_row_serials(row);
    if (serials.length) return serials;
    // Generic fallback for child tables with no serial/batch tracking at all:
    // one label per row, identified by the row's own unique name.
    return row && row.name ? [row.name] : [];
};
