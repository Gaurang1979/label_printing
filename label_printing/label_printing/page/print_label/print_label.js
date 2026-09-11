frappe.pages['print-label'].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({ parent: wrapper, title: __('Print Label'), single_column: true });
    const $wrapper = $(wrapper);
    const $root = $wrapper.find('.layout-main-section');

    $root.html(`
<style>
.pl-wrap{display:flex;flex-direction:column;gap:14px;max-width:1100px}
.pl-panel{border:1px solid var(--border-color);border-radius:8px;background:var(--card-bg);padding:14px 16px}
.pl-panel.pl-disabled{opacity:.45;pointer-events:none}
.pl-panel-title{font-weight:700;font-size:13px;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;display:flex;align-items:center;gap:8px}
.pl-panel-title .pl-step{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--primary-color);color:#fff;font-size:11px}
.pl-quick{display:flex;gap:8px;align-items:center}
.pl-quick input{flex:1;padding:8px 10px;border:1px solid var(--border-color);border-radius:5px;background:var(--control-bg)}
.pl-doctype-select{width:340px;padding:7px 10px;border:1px solid var(--border-color);border-radius:5px;background:var(--control-bg)}
.pl-cards{display:flex;flex-wrap:wrap;gap:10px}
.pl-card{border:1px solid var(--border-color);border-radius:6px;padding:10px 12px;min-width:220px;cursor:pointer;background:var(--control-bg)}
.pl-card.selected{border-color:var(--primary-color);box-shadow:0 0 0 1px var(--primary-color)}
.pl-card .pl-card-title{font-weight:600;margin-bottom:3px}
.pl-card .pl-card-sub{font-size:11px;color:var(--text-muted)}
.pl-card .pl-card-actions{margin-top:8px}
.pl-doc-search{position:relative;max-width:420px}
.pl-doc-search input{width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:5px;background:var(--control-bg)}
.pl-doc-results{position:absolute;left:0;right:0;top:100%;background:var(--card-bg);border:1px solid var(--border-color);border-radius:5px;max-height:260px;overflow:auto;z-index:50;box-shadow:0 4px 14px rgba(0,0,0,.15)}
.pl-doc-results .pl-doc-row{padding:7px 10px;cursor:pointer;font-size:13px}
.pl-doc-results .pl-doc-row:hover{background:var(--control-bg)}
.pl-selected-doc{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;background:var(--control-bg);border-radius:5px;margin-top:8px}
.pl-items-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap}
.pl-items-toolbar input[type=text]{flex:1;min-width:180px;padding:7px 10px;border:1px solid var(--border-color);border-radius:5px;background:var(--control-bg)}
.pl-items-table{width:100%;border-collapse:collapse;font-size:12px}
.pl-items-table th,.pl-items-table td{padding:6px 8px;border-bottom:1px solid var(--border-color);text-align:left}
.pl-items-table tr.pl-hidden{display:none}
.pl-tag-printed{display:inline-block;padding:1px 6px;border-radius:10px;background:var(--green-100,#e3f6e8);color:var(--green-600,#1c8a3e);font-size:10px}
.pl-reprint-row{display:flex;align-items:center;gap:8px;margin:10px 0}
.pl-reprint-row input[type=text]{flex:1;padding:6px 10px;border:1px solid var(--border-color);border-radius:5px;background:var(--control-bg)}
.pl-actions{display:flex;gap:8px;align-items:center;margin-top:10px}
.pl-count{font-size:12px;color:var(--text-muted)}
</style>
<div class="pl-wrap">
  <div class="pl-panel">
    <div class="pl-panel-title">${__('Quick Reprint by Serial / Label Number')}</div>
    <div class="pl-quick">
      <input type="text" class="pl-quick-serial" placeholder="${__('Enter a serial or label number that was already printed...')}">
      <button class="btn btn-sm btn-default pl-quick-go">${__('Find')}</button>
    </div>
  </div>

  <div class="pl-panel">
    <div class="pl-panel-title"><span class="pl-step">1</span>${__('What are you printing for?')}</div>
    <select class="pl-doctype-select"><option value="">${__('Select a DocType...')}</option></select>
  </div>

  <div class="pl-panel pl-disabled pl-step-2">
    <div class="pl-panel-title"><span class="pl-step">2</span>${__('Choose a label')}</div>
    <div class="pl-cards pl-template-cards"></div>
  </div>

  <div class="pl-panel pl-disabled pl-step-3">
    <div class="pl-panel-title"><span class="pl-step">3</span>${__('Choose the document')}</div>
    <div class="pl-doc-search">
      <input type="text" class="pl-doc-input" placeholder="${__('Search by name...')}">
      <div class="pl-doc-results" style="display:none"></div>
    </div>
    <div class="pl-selected-doc-wrap"></div>
  </div>

  <div class="pl-panel pl-disabled pl-step-4"></div>
</div>`);

    const $r = $root;
    const api = (method, args) => new Promise((resolve, reject) => frappe.call({ method, args: args || {}, callback: r => resolve(r.message), error: reject }));
    const esc = v => frappe.utils.escape_html(String(v == null ? '' : v));

    let state = { doctype: null, template: null, templates: [], doc_name: null, doc_title: null, rows: [], printed: new Set() };

    function set_step_enabled(step, enabled) {
        $r.find('.pl-step-' + step).toggleClass('pl-disabled', !enabled);
    }

    function reset_from_step(step) {
        if (step <= 2) { state.template = null; $r.find('.pl-template-cards').empty(); set_step_enabled(2, false); }
        if (step <= 3) { state.doc_name = null; state.doc_title = null; $r.find('.pl-selected-doc-wrap').empty(); $r.find('.pl-doc-input').val(''); set_step_enabled(3, false); }
        if (step <= 4) { state.rows = []; $r.find('.pl-step-4').empty().addClass('pl-disabled'); }
    }

    // ---- Step 1: DocType -----------------------------------------------
    async function load_doctypes() {
        const doctypes = await api('label_printing.api.get_printable_doctypes');
        const $select = $r.find('.pl-doctype-select');
        doctypes.forEach(dt => $select.append($('<option>').val(dt).text(dt)));
    }
    $r.find('.pl-doctype-select').on('change', function () {
        state.doctype = $(this).val() || null;
        reset_from_step(2);
        if (!state.doctype) return;
        load_templates();
    });

    // ---- Step 2: Template ------------------------------------------------
    async function load_templates() {
        const templates = await api('label_printing.api.get_print_buttons', { doctype: state.doctype });
        state.templates = templates;
        const $cards = $r.find('.pl-template-cards').empty();
        if (!templates.length) {
            $cards.append(`<div class="text-muted">${__('No Active Label Template exists yet for {0}.', [esc(state.doctype)])} <a href="/app/label-template/new">${__('Create one')}</a></div>`);
            set_step_enabled(2, true);
            return;
        }
        templates.forEach(t => {
            const card = $(`<div class="pl-card" data-name="${esc(t.name)}">
                <div class="pl-card-title">${esc(t.print_button_label || t.name)}</div>
                <div class="pl-card-sub">${t.source_child_table ? __('Per item / serial number') : __('One label per document')}</div>
                <div class="pl-card-actions"><button type="button" class="btn btn-xs btn-default pl-preview">${__('Preview')}</button></div>
            </div>`);
            card.on('click', function (e) {
                if ($(e.target).hasClass('pl-preview')) return;
                $cards.find('.pl-card').removeClass('selected');
                card.addClass('selected');
                state.template = t;
                reset_from_step(3);
                set_step_enabled(3, true);
            });
            card.find('.pl-preview').on('click', (e) => { e.stopPropagation(); preview_template(t); });
            $cards.append(card);
        });
        set_step_enabled(2, true);
    }

    async function preview_template(t) {
        const tpl = await api('frappe.client.get', { doctype: 'Label Template', name: t.name });
        const pw = flt(tpl.label_width_mm) || 50, ph = flt(tpl.label_height_mm) || 30;
        const scale = Math.max(2, Math.min(6, 420 / Math.max(1, pw)));
        const d = new frappe.ui.Dialog({ title: __('Preview - {0}', [t.print_button_label || t.name]), fields: [{ fieldname: 'preview', fieldtype: 'HTML' }] });
        d.show();
        const wrap = d.fields_dict.preview.$wrapper;
        wrap.html(`<div style="display:flex;justify-content:center;padding:16px;background:var(--subtle-fg);border-radius:6px"><div style="position:relative;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.18);width:${pw * scale}px;height:${ph * scale}px"></div></div>`);
        const canvas = wrap.find('div div');
        (tpl.objects || []).forEach(o => {
            const value = o.fixed_text || (o.fieldname ? '{{ ' + o.fieldname + ' }}' : (o.object_type || 'Object'));
            const el = $('<div></div>').css({
                position: 'absolute', left: flt(o.x_mm) * scale, top: flt(o.y_mm) * scale,
                width: Math.max(4, flt(o.width_mm || 10) * scale), height: Math.max(4, flt(o.height_mm || 6) * scale),
                fontSize: Math.max(7, flt(o.font_size || 28) / 3) + 'px', overflow: 'hidden', display: 'flex', alignItems: 'center',
                border: ['Rectangle'].includes(o.object_type) ? '1px solid #222' : 'none',
                borderTop: o.object_type === 'Line' ? '1px solid #222' : 'none',
            }).text(['Line', 'Rectangle'].includes(o.object_type) ? '' : value);
            canvas.append(el);
        });
    }

    // ---- Step 3: Document -------------------------------------------------
    let doc_search_timer = null;
    $r.find('.pl-doc-input').on('input', function () {
        const txt = $(this).val();
        clearTimeout(doc_search_timer);
        doc_search_timer = setTimeout(async () => {
            const results = await api('label_printing.api.search_documents', { doctype: state.doctype, txt });
            const $box = $r.find('.pl-doc-results').empty().show();
            if (!results.length) { $box.append(`<div class="pl-doc-row text-muted">${__('No matches')}</div>`); return; }
            results.forEach(row => {
                const label = row.title && row.title !== row.name ? `${esc(row.name)} — ${esc(row.title)}` : esc(row.name);
                const $row = $(`<div class="pl-doc-row">${label}</div>`);
                $row.on('click', () => select_document(row.name, row.title));
                $box.append($row);
            });
        }, 250);
    });
    $(document).on('click', function (e) {
        if (!$(e.target).closest('.pl-doc-search').length) $r.find('.pl-doc-results').hide();
    });

    async function select_document(name, title) {
        state.doc_name = name; state.doc_title = title;
        $r.find('.pl-doc-results').hide();
        $r.find('.pl-doc-input').val('');
        $r.find('.pl-selected-doc-wrap').html(`<span class="pl-selected-doc">${esc(name)}${title && title !== name ? ' — ' + esc(title) : ''} <a href="#" class="pl-change-doc">${__('change')}</a></span>`);
        $r.find('.pl-change-doc').on('click', (e) => { e.preventDefault(); reset_from_step(3); set_step_enabled(3, true); });
        set_step_enabled(4, true);
        await load_step4();
    }

    // ---- Step 4: Items / Copies -------------------------------------------
    async function load_step4() {
        const $panel = $r.find('.pl-step-4').removeClass('pl-disabled').empty();
        const printed = await api('label_printing.api.get_reprint_candidates', { source_doctype: state.doctype, source_name: state.doc_name });
        state.printed = new Set(printed || []);

        if (state.template.source_child_table) {
            await render_item_table($panel);
        } else {
            render_document_level($panel);
        }
    }

    async function render_item_table($panel) {
        $panel.append(`<div class="pl-panel-title"><span class="pl-step">4</span>${__('Select items to print')}</div>`);
        const doc = await api('frappe.client.get', { doctype: state.doctype, name: state.doc_name });
        const rows = doc[state.template.source_child_table] || [];
        const built = [];
        for (const row of rows) {
            const ids = await label_printing.resolve_row_identities(row);
            ids.forEach(id => built.push({
                id, row,
                item_code: row.item_code || row.item || '',
                item_name: row.item_name || '',
                warehouse: row.warehouse || row.t_warehouse || row.s_warehouse || row.set_warehouse || '',
                qty: row.qty !== undefined ? row.qty : '',
            }));
        }
        state.rows = built;

        if (!built.length) {
            $panel.append(`<div class="text-muted">${__('No serial numbers / rows found on this document.')}</div>`);
            return;
        }

        $panel.append(`
            <div class="pl-items-toolbar">
                <input type="text" class="pl-item-search" placeholder="${__('Search serial number or item...')}">
                <button type="button" class="btn btn-xs btn-default pl-select-all">${__('Select All')}</button>
                <button type="button" class="btn btn-xs btn-default pl-select-none">${__('Select None')}</button>
                <span class="pl-count"></span>
            </div>
            <div style="max-height:340px;overflow:auto;border:1px solid var(--border-color);border-radius:6px">
            <table class="pl-items-table">
                <thead><tr><th></th><th>${__('Item Code')}</th><th>${__('Item Name')}</th><th>${__('Warehouse')}</th><th>${__('Serial / Label No')}</th><th></th></tr></thead>
                <tbody></tbody>
            </table>
            </div>
            <div class="pl-reprint-row">
                <label><input type="checkbox" class="pl-is-reprint"> ${__('This is a reprint (damaged label)')}</label>
                <input type="text" class="pl-reprint-reason" placeholder="${__('Reason (required for reprint)')}" style="display:none">
            </div>
            <div class="pl-actions">
                <button type="button" class="btn btn-sm btn-primary pl-print-selected">${__('Print Selected')}</button>
                <span class="pl-print-status text-muted"></span>
            </div>
        `);

        const $tbody = $panel.find('tbody');
        built.forEach((item, idx) => {
            const already = state.printed.has(item.id);
            const $tr = $(`<tr data-idx="${idx}" data-search="${esc((item.id + ' ' + item.item_code + ' ' + item.item_name).toLowerCase())}">
                <td><input type="checkbox" class="pl-row-check"></td>
                <td>${esc(item.item_code)}</td>
                <td>${esc(item.item_name)}</td>
                <td>${esc(item.warehouse)}</td>
                <td>${esc(item.id)}</td>
                <td>${already ? `<span class="pl-tag-printed">${__('printed')}</span>` : ''}</td>
            </tr>`);
            $tbody.append($tr);
        });

        function update_count() { $panel.find('.pl-count').text(__('{0} selected', [$panel.find('.pl-row-check:checked').length])); }
        $panel.find('.pl-row-check').on('change', update_count);
        $panel.find('.pl-select-all').on('click', () => { $panel.find('tr:not(.pl-hidden) .pl-row-check').prop('checked', true); update_count(); });
        $panel.find('.pl-select-none').on('click', () => { $panel.find('.pl-row-check').prop('checked', false); update_count(); });
        $panel.find('.pl-item-search').on('input', function () {
            const q = $(this).val().toLowerCase().trim();
            $tbody.find('tr').each(function () { $(this).toggleClass('pl-hidden', !!q && $(this).attr('data-search').indexOf(q) === -1); });
        });
        $panel.find('.pl-is-reprint').on('change', function () { $panel.find('.pl-reprint-reason').toggle($(this).is(':checked')); });

        $panel.find('.pl-print-selected').on('click', async function () {
            const reprint = $panel.find('.pl-is-reprint').is(':checked');
            const reason = $panel.find('.pl-reprint-reason').val();
            if (reprint && !reason) return frappe.msgprint(__('Enter a reason for the reprint.'));
            const selected_idx = $panel.find('.pl-row-check:checked').closest('tr').map(function () { return $(this).attr('data-idx'); }).get();
            if (!selected_idx.length) return frappe.msgprint(__('Select at least one row.'));
            const by_row = {};
            selected_idx.forEach(i => {
                const item = built[i];
                (by_row[item.row.idx] = by_row[item.row.idx] || { row: item.row, ids: [] }).ids.push(item.id);
            });
            const $btn = $(this).prop('disabled', true);
            const $status = $panel.find('.pl-print-status');
            for (const key of Object.keys(by_row)) {
                const group = by_row[key];
                $status.text(__('Printing...'));
                await label_printing.print_job(null, group.ids, {
                    source_doctype: state.doctype, source_name: state.doc_name, row: group.row,
                    child_table: state.template.source_child_table, template: state.template.name,
                    printer: state.template.printer, reprint, reprint_reason: reason,
                });
            }
            $status.text(__('Done.'));
            $btn.prop('disabled', false);
            await load_step4();
        });
        update_count();
    }

    function render_document_level($panel) {
        $panel.append(`
            <div class="pl-panel-title"><span class="pl-step">4</span>${__('Print')}</div>
            <div class="pl-field" style="max-width:220px"><label>${__('Number of Labels')}</label><input type="number" class="pl-copies" value="1" min="1"></div>
            <div class="pl-reprint-row">
                <label><input type="checkbox" class="pl-is-reprint"> ${__('This is a reprint (damaged label)')}</label>
                <input type="text" class="pl-reprint-reason" placeholder="${__('Reason (required for reprint)')}" style="display:none">
            </div>
            <div class="pl-actions">
                <button type="button" class="btn btn-sm btn-primary pl-print-doc">${__('Print')}</button>
                <span class="pl-print-status text-muted"></span>
            </div>
        `);
        $panel.find('.pl-is-reprint').on('change', function () { $panel.find('.pl-reprint-reason').toggle($(this).is(':checked')); });
        $panel.find('.pl-print-doc').on('click', async function () {
            const reprint = $panel.find('.pl-is-reprint').is(':checked');
            const reason = $panel.find('.pl-reprint-reason').val();
            if (reprint && !reason) return frappe.msgprint(__('Enter a reason for the reprint.'));
            const n = Math.max(1, cint($panel.find('.pl-copies').val()) || 1);
            const ids = n === 1 ? [state.doc_name] : Array.from({ length: n }, (_, i) => `${state.doc_name}-${i + 1}`);
            const $status = $panel.find('.pl-print-status').text(__('Printing...'));
            await label_printing.print_job(null, ids, {
                source_doctype: state.doctype, source_name: state.doc_name,
                template: state.template.name, printer: state.template.printer,
                reprint, reprint_reason: reason,
            });
            $status.text(__('Done.'));
        });
    }

    // ---- Quick reprint by serial number ------------------------------------
    async function quick_reprint() {
        const serial_no = $r.find('.pl-quick-serial').val().trim();
        if (!serial_no) return;
        let source;
        try {
            source = await api('label_printing.print_api.find_reprint_source', { serial_no });
        } catch (e) { return frappe.msgprint(__('Lookup failed.')); }
        if (!source) return frappe.msgprint(__('No earlier print found for {0}.', [esc(serial_no)]));
        frappe.prompt(
            [{ fieldname: 'reason', fieldtype: 'Small Text', label: __('Reason'), reqd: 1 }],
            async (values) => {
                await label_printing.print_job(null, [serial_no], {
                    source_doctype: source.source_doctype, source_name: source.source_name,
                    template: source.template, printer: source.printer,
                    reprint: true, reprint_reason: values.reason,
                });
                frappe.show_alert({ message: __('Reprint sent.'), indicator: 'green' });
            },
            __('Reprint / Damaged Label'), __('Reprint')
        );
    }
    $r.find('.pl-quick-go').on('click', quick_reprint);
    $r.find('.pl-quick-serial').on('keydown', e => { if (e.key === 'Enter') quick_reprint(); });

    load_doctypes();
};
