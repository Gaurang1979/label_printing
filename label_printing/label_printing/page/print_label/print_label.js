frappe.pages['print-label'].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({ parent: wrapper, title: __('Print Label'), single_column: true });
    const $wrapper = $(wrapper);
    const $root = $wrapper.find('.layout-main-section');

    $root.html(`
<style>
.pl-wrap{display:flex;flex-direction:column;gap:14px;max-width:1200px}
.pl-panel{border:1px solid var(--border-color);border-radius:8px;background:var(--card-bg);padding:14px 16px}
.pl-panel.pl-disabled{opacity:.45;pointer-events:none}
.pl-panel-title{font-weight:700;font-size:13px;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;display:flex;align-items:center;gap:8px}
.pl-panel-title .pl-step{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--primary-color);color:#fff;font-size:11px}
.pl-doctype-select{width:340px;padding:7px 10px;border:1px solid var(--border-color);border-radius:5px;background:var(--control-bg)}
.pl-side-by-side{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:900px){.pl-side-by-side{grid-template-columns:1fr}}
.pl-cards{display:flex;flex-wrap:wrap;gap:10px}
.pl-card{border:1px solid var(--border-color);border-radius:6px;padding:9px;width:190px;cursor:pointer;background:var(--control-bg)}
.pl-card.selected{border-color:var(--primary-color);box-shadow:0 0 0 1px var(--primary-color)}
.pl-card .pl-card-title{font-weight:600;margin-bottom:2px;font-size:12px}
.pl-card .pl-card-sub{font-size:10px;color:var(--text-muted);margin-bottom:6px}
.pl-card-preview{background:var(--subtle-fg);border-radius:4px;display:flex;align-items:center;justify-content:center;min-height:60px;overflow:hidden}
.pl-card-preview-canvas{position:relative;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.15)}
.pl-filter-row{display:flex;gap:8px;align-items:center;margin-bottom:8px}
.pl-filter-row select{width:220px;padding:6px 8px;border:1px solid var(--border-color);border-radius:5px;background:var(--control-bg)}
.pl-filter-row input{flex:1;padding:6px 10px;border:1px solid var(--border-color);border-radius:5px;background:var(--control-bg)}
.pl-doc-search{position:relative}
.pl-doc-search input, .pl-item-search-box input{width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:5px;background:var(--control-bg)}
.pl-doc-results, .pl-item-results{position:absolute;left:0;right:0;top:100%;background:var(--card-bg);border:1px solid var(--border-color);border-radius:5px;max-height:260px;overflow:auto;z-index:50;box-shadow:0 4px 14px rgba(0,0,0,.15)}
.pl-doc-results .pl-doc-row, .pl-item-results .pl-doc-row{padding:7px 10px;cursor:pointer;font-size:13px}
.pl-doc-results .pl-doc-row:hover, .pl-item-results .pl-doc-row:hover{background:var(--control-bg)}
.pl-selected-doc{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;background:var(--control-bg);border-radius:5px;margin-top:8px}
.pl-items-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap}
.pl-items-toolbar input[type=text]{flex:1;min-width:180px;padding:7px 10px;border:1px solid var(--border-color);border-radius:5px;background:var(--control-bg)}
.pl-item-groups{max-height:420px;overflow:auto;border:1px solid var(--border-color);border-radius:6px}
.pl-item-group{border-bottom:1px solid var(--border-color)}.pl-item-group:last-child{border-bottom:0}.pl-item-group.pl-hidden{display:none}
.pl-item-group-head{display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--subtle-fg)}
.pl-item-group-info{flex:1;min-width:0}
.pl-item-group-title{font-weight:600;font-size:13px}
.pl-item-group-sub{font-size:11px;color:var(--text-muted)}
.pl-item-group-serials{display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px 10px 34px}
.pl-serial-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border:1px solid var(--border-color);border-radius:14px;font-size:11px;background:var(--card-bg);cursor:pointer}
.pl-tag-printed{display:inline-block;padding:1px 6px;border-radius:10px;background:var(--green-100,#e3f6e8);color:var(--green-600,#1c8a3e);font-size:10px}
.pl-tag-status{display:inline-block;padding:1px 6px;border-radius:10px;background:var(--control-bg);font-size:10px}
.pl-reprint-row{display:flex;align-items:center;gap:8px;margin:10px 0}
.pl-reprint-row input[type=text]{flex:1;padding:6px 10px;border:1px solid var(--border-color);border-radius:5px;background:var(--control-bg)}
.pl-actions{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap}
.pl-count{font-size:12px;color:var(--text-muted)}
.pl-big-action{padding:10px 22px;font-size:14px}
.pl-or-divider{font-size:11px;color:var(--text-muted);text-transform:uppercase;margin:4px 0}
.pl-tabs{display:flex;gap:4px;border-bottom:1px solid var(--border-color);margin-bottom:4px}
.pl-tab-btn{padding:8px 14px;border:none;background:none;cursor:pointer;font-size:13px;color:var(--text-muted);border-bottom:2px solid transparent}
.pl-tab-btn.active{color:var(--text-color);border-bottom-color:var(--primary-color);font-weight:600}
.pl-tab-body{display:none}.pl-tab-body.active{display:flex;flex-direction:column;gap:14px}
</style>
<div class="pl-wrap">
  <div class="pl-tabs">
    <button type="button" class="pl-tab-btn active" data-tab="doc">${__('Print by Document')}</button>
    <button type="button" class="pl-tab-btn" data-tab="serial">${__('Print by Serial Number')}</button>
  </div>

  <div class="pl-tab-body active" data-tab-body="doc">
    <div class="pl-panel">
      <div class="pl-panel-title"><span class="pl-step">1</span>${__('What are you printing for?')}</div>
      <select class="pl-doctype-select"><option value="">${__('Select a DocType...')}</option></select>
    </div>

    <div class="pl-side-by-side pl-disabled pl-step-2">
      <div class="pl-panel">
        <div class="pl-panel-title"><span class="pl-step">2</span>${__('Choose a label')}</div>
        <div class="pl-cards pl-template-cards"></div>
      </div>
      <div class="pl-panel">
        <div class="pl-panel-title"><span class="pl-step">3</span>${__('Choose the document')}</div>
        <div class="pl-doc-search">
          <input type="text" class="pl-doc-input" placeholder="${__('Search by name...')}">
          <div class="pl-doc-results" style="display:none"></div>
        </div>
        <div class="pl-selected-doc-wrap"></div>
        <div class="pl-filter-rows" style="margin-top:10px"></div>
        <button type="button" class="btn btn-xs btn-default pl-add-filter" style="display:none">${__('Add Filter')}</button>
      </div>
    </div>

    <div class="pl-panel pl-disabled pl-step-4"></div>
  </div>

  <div class="pl-tab-body" data-tab-body="serial">
    <div class="pl-panel">
      <div class="pl-panel-title"><span class="pl-step">1</span>${__('Select an item code')}</div>
      <div class="pl-doc-search pl-item-search-box">
        <input type="text" class="pl-serial-item-input" placeholder="${__('Search item code or name...')}">
        <div class="pl-item-results" style="display:none"></div>
      </div>
      <div class="pl-selected-doc-wrap pl-selected-item-wrap"></div>
    </div>
    <div class="pl-panel pl-disabled pl-step-serials">
      <div class="pl-panel-title"><span class="pl-step">2</span>${__('Select serial numbers to print')}</div>
      <div class="pl-items-toolbar">
        <input type="text" class="pl-serial-search" placeholder="${__('Search serial number...')}">
        <button type="button" class="btn btn-xs btn-default pl-serial-select-all">${__('Select All')}</button>
        <button type="button" class="btn btn-xs btn-default pl-serial-select-none">${__('Select None')}</button>
        <span class="pl-count pl-serial-count"></span>
      </div>
      <div class="pl-item-groups pl-serial-list"></div>
      <div class="pl-reprint-row">
        <input type="text" class="pl-serial-reprint-reason" placeholder="${__('Reason for reprint (required)')}">
      </div>
      <div class="pl-actions">
        <button type="button" class="btn btn-sm btn-primary pl-print-serials">${__('Print / Reprint Selected')}</button>
        <span class="pl-serial-status text-muted"></span>
      </div>
      <div class="text-muted" style="font-size:11px;margin-top:6px">${__('Only serials with earlier print history can be reprinted from here (the original template and printer are reused). For first-time printing, use the Print by Document tab.')}</div>
    </div>
  </div>
</div>`);

    const $r = $root;
    const api = (method, args) => new Promise((resolve, reject) => frappe.call({ method, args: args || {}, callback: r => resolve(r.message), error: reject }));
    const esc = v => frappe.utils.escape_html(String(v == null ? '' : v));

    let state = { doctype: null, template: null, doc_name: null, doc_title: null, filters: [], filter_fields: [] };

    // ---- Tabs ---------------------------------------------------------
    $r.find('.pl-tab-btn').on('click', function () {
        const tab = $(this).attr('data-tab');
        $r.find('.pl-tab-btn').removeClass('active'); $(this).addClass('active');
        $r.find('.pl-tab-body').removeClass('active');
        $r.find(`.pl-tab-body[data-tab-body="${tab}"]`).addClass('active');
    });

    function set_step_enabled(sel, enabled) { $r.find(sel).toggleClass('pl-disabled', !enabled); }

    function reset_after_doctype() {
        state.template = null; state.doc_name = null; state.doc_title = null; state.filters = []; state.filter_fields = [];
        $r.find('.pl-template-cards').empty();
        $r.find('.pl-selected-doc-wrap').empty();
        $r.find('.pl-doc-input').val('');
        $r.find('.pl-filter-rows').empty();
        $r.find('.pl-add-filter').hide();
        $r.find('.pl-step-4').empty().addClass('pl-disabled');
        set_step_enabled('.pl-step-2', false);
    }

    async function maybe_show_step4() {
        if (!state.template || !state.doc_name) { $r.find('.pl-step-4').empty().addClass('pl-disabled'); return; }
        await load_step4();
    }

    // ---- Step 1: DocType ------------------------------------------------
    async function load_doctypes() {
        const doctypes = await api('label_printing.api.get_printable_doctypes');
        const $select = $r.find('.pl-doctype-select');
        doctypes.forEach(dt => $select.append($('<option>').val(dt).text(__(dt))));
    }
    $r.find('.pl-doctype-select').on('change', function () {
        state.doctype = $(this).val() || null;
        reset_after_doctype();
        if (!state.doctype) return;
        set_step_enabled('.pl-step-2', true);
        load_templates();
    });

    // ---- Step 2: Template (with direct inline preview) --------------------
    async function load_templates() {
        const templates = await api('label_printing.api.get_print_buttons', { doctype: state.doctype });
        const $cards = $r.find('.pl-template-cards').empty();
        if (!templates.length) {
            $cards.append(`<div class="text-muted">${__('No Active Label Template exists yet for {0}.', [esc(state.doctype)])} <a href="/app/label-template/new">${__('Create one')}</a></div>`);
            return;
        }
        templates.forEach(t => {
            const card = $(`<div class="pl-card" data-name="${esc(t.name)}">
                <div class="pl-card-title">${esc(t.print_button_label || t.name)}</div>
                <div class="pl-card-sub">${t.source_child_table ? __('Per item / serial number') : __('One label per document')}</div>
                <div class="pl-card-preview"></div>
            </div>`);
            card.on('click', async function () {
                $cards.find('.pl-card').removeClass('selected');
                card.addClass('selected');
                state.template = t;
                state.filters = [];
                await load_filter_fields();
                await maybe_show_step4();
            });
            $cards.append(card);
            render_mini_preview(card.find('.pl-card-preview'), t.name, null);
        });
    }

    async function render_mini_preview($container, template_name, row) {
        const tpl = await api('frappe.client.get', { doctype: 'Label Template', name: template_name });
        const pw = flt(tpl.label_width_mm) || 50, ph = flt(tpl.label_height_mm) || 30;
        const scale = Math.max(1.1, Math.min(3, 170 / Math.max(1, pw)));
        const canvas = $(`<div class="pl-card-preview-canvas" style="width:${pw * scale}px;height:${ph * scale}px"></div>`);
        $container.empty().append(canvas);
        (tpl.objects || []).forEach(o => {
            let value = o.fixed_text;
            if (!value && o.fieldname) {
                const real = row ? row[o.fieldname] : undefined;
                value = (real === undefined || real === null || real === '') ? '{{ ' + o.fieldname + ' }}' : String(real);
            }
            value = value || (o.object_type || '');
            const el = $('<div></div>').css({
                position: 'absolute', left: flt(o.x_mm) * scale, top: flt(o.y_mm) * scale,
                width: Math.max(3, flt(o.width_mm || 10) * scale), height: Math.max(3, flt(o.height_mm || 6) * scale),
                fontSize: Math.max(5, flt(o.font_size || 28) / 4) + 'px', overflow: 'hidden', display: 'flex', alignItems: 'center',
                border: ['Rectangle'].includes(o.object_type) ? '1px solid #222' : 'none',
                borderTop: o.object_type === 'Line' ? '1px solid #222' : 'none',
            }).text(['Line', 'Rectangle'].includes(o.object_type) ? '' : value);
            canvas.append(el);
        });
        return tpl;
    }

    // ---- Filters (scoped to fields the chosen template actually uses) -----
    async function load_filter_fields() {
        state.filter_fields = await api('label_printing.api.get_template_filter_fields', { template: state.template.name });
        $r.find('.pl-add-filter').toggle(!!state.filter_fields.length);
        render_filter_rows();
    }
    function render_filter_rows() {
        const $rows = $r.find('.pl-filter-rows').empty();
        if (!state.filter_fields.length) return;
        (state.filters.length ? state.filters : []).forEach((f, idx) => {
            const $row = $(`<div class="pl-filter-row" data-idx="${idx}">
                <select class="pl-filter-field"><option value="">${__('Select field...')}</option>${state.filter_fields.map(fld => `<option value="${esc(fld.value)}" data-scope="${fld.scope}" data-child="${esc(fld.child_doctype || '')}" ${fld.value === f[0] ? 'selected' : ''}>${esc(fld.label)}${fld.scope === 'child' ? ' (' + __('item') + ')' : ''}</option>`).join('')}</select>
                <input type="text" class="pl-filter-value" placeholder="${__('Value contains...')}" value="${esc(f[1] || '')}">
                <button type="button" class="btn btn-xs btn-default pl-remove-filter">${__('Remove')}</button>
            </div>`);
            $row.find('.pl-remove-filter').on('click', () => { state.filters.splice(idx, 1); render_filter_rows(); run_doc_search(); });
            $rows.append($row);
        });
    }
    $r.find('.pl-add-filter').on('click', () => { state.filters.push(['', '', 'parent', null]); render_filter_rows(); });
    function collect_filters() {
        state.filters = $r.find('.pl-filter-row').map(function () {
            const $opt = $(this).find('.pl-filter-field option:selected');
            return [$opt.val(), $(this).find('.pl-filter-value').val(), $opt.attr('data-scope') || 'parent', $opt.attr('data-child') || null];
        }).get().filter(f => f[0] && f[1]);
    }
    $r.on('change', '.pl-filter-field', () => { collect_filters(); run_doc_search(); });
    $r.on('input', '.pl-filter-value', frappe.utils.debounce(() => { collect_filters(); run_doc_search(); }, 400));

    // ---- Step 3: Document -------------------------------------------------
    let doc_search_timer = null;
    async function run_doc_search() {
        if (!state.doctype) return;
        const txt = $r.find('.pl-doc-input').val();
        const results = await api('label_printing.api.search_documents', { doctype: state.doctype, txt, filters: state.filters });
        const $box = $r.find('.pl-doc-results').empty().show();
        if (!results.length) { $box.append(`<div class="pl-doc-row text-muted">${__('No matches')}</div>`); return; }
        results.forEach(row => {
            const label = row.title && row.title !== row.name ? `${esc(row.name)} — ${esc(row.title)}` : esc(row.name);
            const $row = $(`<div class="pl-doc-row">${label}</div>`);
            $row.on('click', () => select_document(row.name, row.title));
            $box.append($row);
        });
    }
    $r.find('.pl-doc-input').on('input', function () { clearTimeout(doc_search_timer); doc_search_timer = setTimeout(run_doc_search, 250); });
    $r.find('.pl-doc-input').on('focus', function () { if (state.doctype) run_doc_search(); });
    $(document).on('click', function (e) {
        if (!$(e.target).closest('.pl-doc-search').length) $r.find('.pl-doc-results, .pl-item-results').hide();
    });

    async function select_document(name, title) {
        state.doc_name = name; state.doc_title = title;
        $r.find('.pl-doc-results').hide();
        $r.find('.pl-doc-input').val('');
        $r.find('.pl-selected-doc-wrap').html(`<span class="pl-selected-doc">${esc(name)}${title && title !== name ? ' — ' + esc(title) : ''} <a href="#" class="pl-change-doc">${__('change')}</a></span>`);
        $r.find('.pl-change-doc').on('click', (e) => { e.preventDefault(); state.doc_name = null; state.doc_title = null; $r.find('.pl-selected-doc-wrap').empty(); maybe_show_step4(); });
        await maybe_show_step4();
    }

    // ---- Step 4: Items / Copies (shown once BOTH template + document are chosen) --
    async function load_step4() {
        const $panel = $r.find('.pl-step-4').removeClass('pl-disabled').empty();
        const printed = await api('label_printing.api.get_reprint_candidates', { source_doctype: state.doctype, source_name: state.doc_name });
        const printed_set = new Set(printed || []);
        if (state.template.source_child_table) await render_item_table($panel, printed_set);
        else await render_document_level($panel);
    }

    async function render_item_table($panel, printed_set) {
        $panel.append(`<div class="pl-panel-title"><span class="pl-step">4</span>${__('Print labels')}</div>`);
        const doc = await api('frappe.client.get', { doctype: state.doctype, name: state.doc_name });
        const rows = doc[state.template.source_child_table] || [];
        const groups = [];
        for (const row of rows) {
            const ids = await label_printing.resolve_row_identities(row);
            if (!ids.length) continue;
            groups.push({
                row, ids,
                item_code: row.item_code || row.item || '',
                item_name: row.item_name || '',
                warehouse: row.warehouse || row.t_warehouse || row.s_warehouse || row.set_warehouse || '',
                qty: row.qty !== undefined ? row.qty : '',
                uom: row.uom || row.stock_uom || '',
            });
        }
        if (!groups.length) { $panel.append(`<div class="text-muted">${__('No serial numbers / rows found on this document.')}</div>`); return; }

        $panel.append(`
            <div class="pl-items-toolbar">
                <input type="text" class="pl-item-search" placeholder="${__('Search item or serial number...')}">
                <button type="button" class="btn btn-xs btn-default pl-select-all">${__('Select All')}</button>
                <button type="button" class="btn btn-xs btn-default pl-select-none">${__('Select None')}</button>
                <span class="pl-count"></span>
            </div>
            <div class="pl-item-groups"></div>
            <div class="pl-reprint-row">
                <label><input type="checkbox" class="pl-is-reprint"> ${__('This is a reprint (damaged label)')}</label>
                <input type="text" class="pl-reprint-reason" placeholder="${__('Reason (required for reprint)')}" style="display:none">
            </div>
            <div class="pl-actions">
                <button type="button" class="btn btn-sm btn-primary pl-print-selected">${__('Print Selected')}</button>
                <span class="pl-print-status2 text-muted"></span>
            </div>
        `);

        async function print_groups(group_ids_map, reprint, reason) {
            const $status = $panel.find('.pl-print-status2');
            for (const gidx of Object.keys(group_ids_map)) {
                const group = groups[gidx];
                $status.text(__('Printing {0}...', [group.item_code || group.row.idx]));
                await label_printing.print_job(null, group_ids_map[gidx], {
                    source_doctype: state.doctype, source_name: state.doc_name, row: group.row,
                    child_table: state.template.source_child_table, template: state.template.name,
                    printer: state.template.printer, reprint, reprint_reason: reason,
                });
            }
            $status.text(__('Done.'));
            await load_step4();
        }

        const $groups = $panel.find('.pl-item-groups');
        groups.forEach((group, gidx) => {
            const printed_count = group.ids.filter(id => printed_set.has(id)).length;
            const $group = $(`<div class="pl-item-group" data-gidx="${gidx}" data-search="${esc((group.item_code + ' ' + group.item_name + ' ' + group.ids.join(' ')).toLowerCase())}">
                <div class="pl-item-group-head">
                    <label><input type="checkbox" class="pl-group-check" checked></label>
                    <div class="pl-item-group-info">
                        <div class="pl-item-group-title">${esc(group.item_code)}${group.item_name && group.item_name !== group.item_code ? ' — ' + esc(group.item_name) : ''}</div>
                        <div class="pl-item-group-sub">${group.warehouse ? esc(group.warehouse) + ' · ' : ''}${group.qty !== '' ? __('Qty') + ' ' + esc(group.qty) + (group.uom ? ' ' + esc(group.uom) : '') + ' · ' : ''}${__('{0} serial number(s)', [group.ids.length])}${printed_count ? ' · ' + __('{0} already printed', [printed_count]) : ''}</div>
                    </div>
                    <button type="button" class="btn btn-xs btn-default pl-group-print">${__('Print This Item')}</button>
                </div>
                <div class="pl-item-group-serials"></div>
            </div>`);
            const $serials = $group.find('.pl-item-group-serials');
            group.ids.forEach((id, sidx) => {
                const already = printed_set.has(id);
                $serials.append(`<label class="pl-serial-chip"><input type="checkbox" class="pl-serial-check" data-gidx="${gidx}" data-sidx="${sidx}" checked> ${esc(id)} ${already ? `<span class="pl-tag-printed">${__('printed')}</span>` : ''}</label>`);
            });
            $group.find('.pl-group-print').on('click', async (e) => { e.stopPropagation(); await print_groups({ [gidx]: group.ids }, false, null); });
            $group.find('.pl-group-check').on('change', function () { $group.find('.pl-serial-check').prop('checked', $(this).is(':checked')); update_count(); });
            $groups.append($group);
        });

        function all_checkboxes() { return $panel.find('.pl-serial-check'); }
        function update_count() {
            all_checkboxes().each(function () {
                const group = $(this).closest('.pl-item-group');
                group.find('.pl-group-check').prop('checked', !group.find('.pl-serial-check:not(:checked)').length);
            });
            $panel.find('.pl-count').text(__('{0} of {1} selected', [all_checkboxes().filter(':checked').length, all_checkboxes().length]));
        }
        all_checkboxes().on('change', update_count);
        $panel.find('.pl-select-all').on('click', () => { $groups.find('.pl-item-group:not(.pl-hidden) .pl-serial-check').prop('checked', true); update_count(); });
        $panel.find('.pl-select-none').on('click', () => { all_checkboxes().prop('checked', false); update_count(); });
        $panel.find('.pl-item-search').on('input', function () {
            const q = $(this).val().toLowerCase().trim();
            $groups.find('.pl-item-group').each(function () { $(this).toggleClass('pl-hidden', !!q && $(this).attr('data-search').indexOf(q) === -1); });
        });
        $panel.find('.pl-is-reprint').on('change', function () { $panel.find('.pl-reprint-reason').toggle($(this).is(':checked')); });

        $panel.find('.pl-print-selected').on('click', async function () {
            const reprint = $panel.find('.pl-is-reprint').is(':checked');
            const reason = $panel.find('.pl-reprint-reason').val();
            if (reprint && !reason) return frappe.msgprint(__('Enter a reason for the reprint.'));
            const selected = all_checkboxes().filter(':checked').map(function () { return { gidx: $(this).attr('data-gidx'), sidx: $(this).attr('data-sidx') }; }).get();
            if (!selected.length) return frappe.msgprint(__('Select at least one serial number.'));
            const by_group = {};
            selected.forEach(s => (by_group[s.gidx] = by_group[s.gidx] || []).push(groups[s.gidx].ids[s.sidx]));
            $(this).prop('disabled', true);
            await print_groups(by_group, reprint, reason);
            $(this).prop('disabled', false);
        });
        update_count();
    }

    async function render_document_level($panel) {
        $panel.append(`<div class="pl-panel-title"><span class="pl-step">4</span>${__('Print')}</div>`);
        const preview_wrap = $('<div class="pl-card-preview" style="margin-bottom:10px;min-height:110px"></div>');
        $panel.append(preview_wrap);
        const doc = await api('frappe.client.get', { doctype: state.doctype, name: state.doc_name });
        render_mini_preview(preview_wrap, state.template.name, doc);

        $panel.append(`
            <div class="pl-actions">
                <button type="button" class="btn btn-primary pl-big-action pl-print-one">${__('Print This Label')}</button>
                <span class="pl-print-status text-muted"></span>
            </div>
            <div class="pl-or-divider">${__('or print multiple copies (e.g. several cartons)')}</div>
            <div class="pl-field" style="max-width:220px"><label>${__('Number of Labels')}</label><input type="number" class="pl-copies" value="1" min="1"></div>
            <div class="pl-reprint-row">
                <label><input type="checkbox" class="pl-is-reprint"> ${__('This is a reprint (damaged label)')}</label>
                <input type="text" class="pl-reprint-reason" placeholder="${__('Reason (required for reprint)')}" style="display:none">
            </div>
            <div class="pl-actions">
                <button type="button" class="btn btn-sm btn-default pl-print-doc">${__('Print (using Number of Labels above)')}</button>
                <span class="pl-print-status2 text-muted"></span>
            </div>
        `);
        $panel.find('.pl-is-reprint').on('change', function () { $panel.find('.pl-reprint-reason').toggle($(this).is(':checked')); });

        async function do_print(n) {
            const reprint = $panel.find('.pl-is-reprint').is(':checked');
            const reason = $panel.find('.pl-reprint-reason').val();
            if (reprint && !reason) return frappe.msgprint(__('Enter a reason for the reprint.'));
            const ids = n === 1 ? [state.doc_name] : Array.from({ length: n }, (_, i) => `${state.doc_name}-${i + 1}`);
            const $status = $panel.find('.pl-print-status, .pl-print-status2').text(__('Printing...'));
            await label_printing.print_job(null, ids, {
                source_doctype: state.doctype, source_name: state.doc_name,
                template: state.template.name, printer: state.template.printer,
                reprint, reprint_reason: reason,
            });
            $status.text(__('Done.'));
        }
        $panel.find('.pl-print-one').on('click', () => do_print(1));
        $panel.find('.pl-print-doc').on('click', () => do_print(Math.max(1, cint($panel.find('.pl-copies').val()) || 1)));
    }

    // ---- Tab 2: Print by Serial Number (item code first) -------------------
    let item_search_timer = null;
    let serial_state = { item_code: null, serials: [] };
    $r.find('.pl-serial-item-input').on('input', function () {
        clearTimeout(item_search_timer);
        item_search_timer = setTimeout(run_item_search, 250);
    });
    $r.find('.pl-serial-item-input').on('focus', run_item_search);
    async function run_item_search() {
        const txt = $r.find('.pl-serial-item-input').val();
        const results = await api('label_printing.api.search_items', { txt });
        const $box = $r.find('.pl-item-results').empty().show();
        if (!results.length) { $box.append(`<div class="pl-doc-row text-muted">${__('No matching serialized items')}</div>`); return; }
        results.forEach(row => {
            const $row = $(`<div class="pl-doc-row">${esc(row.item_code)}${row.item_name && row.item_name !== row.item_code ? ' — ' + esc(row.item_name) : ''}</div>`);
            $row.on('click', () => select_serial_item(row.item_code));
            $box.append($row);
        });
    }
    async function select_serial_item(item_code) {
        serial_state.item_code = item_code;
        $r.find('.pl-item-results').hide();
        $r.find('.pl-serial-item-input').val('');
        $r.find('.pl-selected-item-wrap').html(`<span class="pl-selected-doc">${esc(item_code)} <a href="#" class="pl-change-item">${__('change')}</a></span>`);
        $r.find('.pl-change-item').on('click', (e) => { e.preventDefault(); serial_state.item_code = null; $r.find('.pl-selected-item-wrap').empty(); set_step_enabled('.pl-step-serials', false); });
        set_step_enabled('.pl-step-serials', true);
        await load_serials_for_item();
    }
    async function load_serials_for_item() {
        const serials = await api('label_printing.api.get_serials_for_item', { item_code: serial_state.item_code });
        serial_state.serials = serials || [];
        const $list = $r.find('.pl-serial-list').empty();
        if (!serial_state.serials.length) { $list.append(`<div class="text-muted" style="padding:8px">${__('No serial numbers found for this item.')}</div>`); return; }
        serial_state.serials.forEach((s, idx) => {
            const $row = $(`<div class="pl-item-group" data-idx="${idx}" data-search="${esc(s.name.toLowerCase())}">
                <div class="pl-item-group-head">
                    <label><input type="checkbox" class="pl-serial-item-check" data-idx="${idx}"></label>
                    <div class="pl-item-group-info">
                        <div class="pl-item-group-title">${esc(s.name)}</div>
                        <div class="pl-item-group-sub">${s.warehouse ? esc(s.warehouse) + ' · ' : ''}<span class="pl-tag-status">${esc(s.status || '')}</span></div>
                    </div>
                </div>
            </div>`);
            $list.append($row);
        });
        update_serial_count();
    }
    function all_serial_checks() { return $r.find('.pl-serial-item-check'); }
    function update_serial_count() { $r.find('.pl-serial-count').text(__('{0} selected', [all_serial_checks().filter(':checked').length])); }
    $r.on('change', '.pl-serial-item-check', update_serial_count);
    $r.find('.pl-serial-select-all').on('click', () => { $r.find('.pl-item-group:not(.pl-hidden) .pl-serial-item-check').prop('checked', true); update_serial_count(); });
    $r.find('.pl-serial-select-none').on('click', () => { all_serial_checks().prop('checked', false); update_serial_count(); });
    $r.find('.pl-serial-search').on('input', function () {
        const q = $(this).val().toLowerCase().trim();
        $r.find('.pl-serial-list .pl-item-group').each(function () { $(this).toggleClass('pl-hidden', !!q && $(this).attr('data-search').indexOf(q) === -1); });
    });
    $r.find('.pl-print-serials').on('click', async function () {
        const reason = $r.find('.pl-serial-reprint-reason').val();
        if (!reason) return frappe.msgprint(__('Enter a reason for the reprint.'));
        const selected_idx = all_serial_checks().filter(':checked').map(function () { return $(this).attr('data-idx'); }).get();
        if (!selected_idx.length) return frappe.msgprint(__('Select at least one serial number.'));
        const $status = $r.find('.pl-serial-status');
        let skipped = 0;
        for (const idx of selected_idx) {
            const serial_no = serial_state.serials[idx].name;
            $status.text(__('Looking up {0}...', [serial_no]));
            let source;
            try { source = await api('label_printing.print_api.find_reprint_source', { serial_no }); }
            catch (e) { source = null; }
            if (!source) { skipped++; continue; }
            $status.text(__('Printing {0}...', [serial_no]));
            await label_printing.print_job(null, [serial_no], {
                source_doctype: source.source_doctype, source_name: source.source_name,
                template: source.template, printer: source.printer,
                reprint: true, reprint_reason: reason,
            });
        }
        $status.text(skipped ? __('Done. {0} serial(s) had no print history and were skipped.', [skipped]) : __('Done.'));
    });

    // ---- Quick Reprint (kept accessible from the By Serial Number tab) ----
    // Handled inline above via Print by Serial Number's reprint flow.

    load_doctypes();
};
