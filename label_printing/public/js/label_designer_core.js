// Shared designer engine, mounted either by the standalone "label-designer"
// page (opts.mode = "standalone": fetches/saves a named Label Template via
// frappe.client) or directly inside the Label Template form's Design tab
// (opts.mode = "embedded": reads/writes the live frm.doc in place, no
// separate fetch/save -- the outer form's own Save persists everything).
//
// This exists so the canvas only has to work ONE way, reused by both call
// sites, instead of an iframe re-loading the whole desk app a second time
// (unreliable across proxies/CSP/nested-boot timing) or two divergent
// copies of the same ~250 lines of logic drifting apart.
frappe.provide("label_printing");

label_printing.ensure_designer_styles = function () {
    if (document.getElementById('label-printing-designer-styles')) return;
    const style = document.createElement('style');
    style.id = 'label-printing-designer-styles';
    style.textContent = `
.lp-designer{display:flex;flex-direction:column;height:calc(100vh - 125px);min-height:560px;gap:8px}
.lp-designer.lp-embedded{height:calc(100vh - 300px);min-height:600px}
.lp-toolbar{display:flex;align-items:center;gap:5px;flex-wrap:wrap}.lp-toolbar .lp-status{margin-left:auto;font-size:12px;color:var(--text-muted)}.lp-toolbar .lp-embed-title{font-size:12px;color:var(--text-muted);margin-right:auto}
.lp-work{display:grid;grid-template-columns:250px minmax(420px,1fr) 300px;gap:8px;flex:1;min-height:0}
.lp-panel{border:1px solid var(--border-color);border-radius:6px;background:var(--card-bg);overflow:hidden;min-height:0}.lp-head{padding:8px 10px;border-bottom:1px solid var(--border-color);font-weight:600}.lp-body{padding:8px;overflow:auto;height:calc(100% - 37px)}
.lp-section{font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin:10px 0 5px}.lp-tools{display:grid;grid-template-columns:1fr 1fr;gap:5px}.lp-tools button{white-space:nowrap}
.lp-canvas-wrap{height:100%;overflow:auto;background:var(--subtle-fg);padding:35px;display:flex;justify-content:center;align-items:flex-start}.lp-canvas{position:relative;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.2);flex:none;touch-action:none}.lp-grid{background-image:linear-gradient(#ddd 1px,transparent 1px),linear-gradient(90deg,#ddd 1px,transparent 1px);background-size:5px 5px}
.lp-object{position:absolute;box-sizing:border-box;border:1px dashed #888;background:rgba(255,255,255,.86);display:flex;align-items:center;overflow:visible;user-select:none;touch-action:none;cursor:move}.lp-object.selected{border:2px solid var(--primary-color);box-shadow:0 0 0 1px var(--primary-color)}.lp-object.locked{cursor:not-allowed}.lp-handle{position:absolute;width:9px;height:9px;background:var(--primary-color);border:1px solid #fff;border-radius:2px;display:none;z-index:20}.lp-object.selected .lp-handle{display:block}.lp-handle.nw{left:-6px;top:-6px;cursor:nwse-resize}.lp-handle.ne{right:-6px;top:-6px;cursor:nesw-resize}.lp-handle.sw{left:-6px;bottom:-6px;cursor:nesw-resize}.lp-handle.se{right:-6px;bottom:-6px;cursor:nwse-resize}
.lp-field{margin-bottom:7px}.lp-field label{display:block;font-size:11px;color:var(--text-muted);margin-bottom:2px}.lp-field input,.lp-field select{width:100%;padding:5px;border:1px solid var(--border-color);border-radius:4px;background:var(--control-bg)}
.lp-g2{display:grid;grid-template-columns:1fr 1fr;gap:6px}.lp-layer{padding:6px;border-bottom:1px solid var(--border-color);cursor:pointer;font-size:12px}.lp-layer.selected{background:var(--control-bg);font-weight:600}.lp-muted{font-size:11px;color:var(--text-muted)}
.lp-field-search{width:100%;padding:5px 8px;margin-bottom:6px;border:1px solid var(--border-color);border-radius:4px;background:var(--control-bg);font-size:12px}
.lp-field-list{max-height:280px;overflow:auto;border:1px solid var(--border-color);border-radius:4px}.lp-field-row{display:flex;align-items:center;gap:5px;padding:5px;border-bottom:1px solid var(--border-color);font-size:11px}.lp-field-row:last-child{border-bottom:0}.lp-field-row span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lp-field-row button{flex:none}.lp-field-row.lp-hidden{display:none}
@media(max-width:1200px){.lp-work{grid-template-columns:220px minmax(360px,1fr)}.lp-props{grid-column:1/-1;height:280px}}
    `;
    document.head.appendChild(style);
};

label_printing.mount_designer = function ($container, opts) {
    opts = opts || {};
    const standalone = opts.mode !== "embedded";
    label_printing.ensure_designer_styles();

    $container.html(`
<div class="lp-designer${standalone ? '' : ' lp-embedded'}">
  <div class="lp-toolbar">
    ${standalone ? '<select class="form-control input-sm lp-template" style="width:270px"></select><button class="btn btn-sm btn-primary lp-save">' + __('Save') + '</button>' : `<span class="lp-embed-title">${__('Editing this template\'s layout -- use the form\'s Save button above to keep changes.')}</span>`}
    <button class="btn btn-sm btn-default lp-undo" title="Ctrl+Z">↶</button><button class="btn btn-sm btn-default lp-redo" title="Ctrl+Y">↷</button>
    <button class="btn btn-sm btn-default lp-copy" title="Ctrl+C">${__('Copy')}</button><button class="btn btn-sm btn-default lp-paste" title="Ctrl+V">${__('Paste')}</button><button class="btn btn-sm btn-default lp-delete" title="Delete">${__('Delete')}</button>
    <button class="btn btn-sm btn-default lp-grid-btn">${__('Grid')}</button><button class="btn btn-sm btn-default lp-snap">${__('Snap')}</button>
    <button class="btn btn-sm btn-default lp-zoom-out">−</button><span class="lp-zoom">100%</span><button class="btn btn-sm btn-default lp-zoom-in">+</button>
    <button class="btn btn-sm btn-default lp-fit">${__('Fit')}</button>
    <span class="lp-status"></span>
  </div>
  <div class="lp-work">
    <div class="lp-panel"><div class="lp-head">${__('Objects & Fields')}</div><div class="lp-body lp-left"></div></div>
    <div class="lp-panel"><div class="lp-head">${__('Label Canvas')}</div><div class="lp-canvas-wrap"><div class="lp-canvas lp-grid"></div></div></div>
    <div class="lp-panel lp-props"><div class="lp-head">${__('Properties')}</div><div class="lp-body lp-properties"></div></div>
  </div>
</div>`);

    const $r = $container, canvas = $r.find('.lp-canvas'), status = $r.find('.lp-status');
    let template_name = opts.template_name || '';
    let doc = null, fields = [], selected = -1, zoom = 1, grid = true, snap = true, first_render = true;
    let drag = null, resize = null, history = [], future = [], clipboard = null;

    const esc = value => frappe.utils.escape_html(String(value == null ? '' : value));
    const clone = value => JSON.parse(JSON.stringify(value));
    const api = (method, args) => new Promise((resolve, reject) => frappe.call({method: method, args: args || {}, callback: r => resolve(r.message), error: reject}));
    const set_status = text => status.text(text || '');
    const snapshot = () => JSON.stringify(doc && doc.objects ? doc.objects : []);
    const push_history = () => { history.push(snapshot()); if (history.length > 50) history.shift(); future = []; };
    const mm = value => Math.round(flt(value) * 10) / 10;
    const snap_value = value => snap ? Math.round(value * 2) / 2 : mm(value);
    const scale = () => Math.max(.65, Math.min(5, 850 / Math.max(1, flt(doc.label_width_mm || 100)))) * zoom;
    const mark_dirty = () => { if (!standalone && opts.on_dirty) opts.on_dirty(); };

    function field_label(field) { return (field.label || field.value) + ' (' + field.value + ')'; }
    function object_label(o) { return o.fixed_text || o.fieldname || o.object_type || __('Object'); }

    function load_templates() {
        return api('frappe.client.get_list', {doctype:'Label Template', fields:['name','template_name'], order_by:'template_name asc', limit_page_length:500}).then(rows => {
            const $select = $r.find('.lp-template').empty();
            (rows || []).forEach(row => $select.append($('<option>').val(row.name).text(row.template_name || row.name)));
            if (template_name) $select.val(template_name);
            if (!template_name && rows && rows.length) { template_name = rows[0].name; $select.val(template_name); }
            return load_template();
        });
    }

    function load_template() {
        if (standalone) {
            if (!template_name) { set_status(__('Create a Label Template first.')); return Promise.resolve(); }
            return api('frappe.client.get', {doctype:'Label Template', name:template_name}).then(result => {
                doc = result;
                doc.objects = doc.objects || [];
                selected = -1; history = []; future = []; first_render = true;
                return load_fields().then(() => { render_left(); render(); set_status(doc.source_child_doctype || doc.source_doctype || template_name); });
            });
        }
        doc = opts.get_doc();
        doc.objects = doc.objects || [];
        selected = -1; history = []; future = []; first_render = true;
        return load_fields().then(() => { render_left(); render(); set_status(doc.source_child_doctype || doc.source_doctype || ''); });
    }

    function load_fields() {
        fields = [];
        if (!doc || !doc.source_child_doctype) return Promise.resolve();
        if (opts.get_fields) return opts.get_fields().then(result => { fields = result || []; });
        return api('label_printing.api.get_doctype_fields', {child_doctype:doc.source_child_doctype}).then(result => { fields = result || []; });
    }

    function render_left() {
        const b = $r.find('.lp-left').empty();
        b.append(`<div class="lp-muted">${__('Label Data')}</div>`);
        b.append(`<div style="font-weight:600;margin:4px 0 8px">${esc(doc && doc.source_child_doctype || __('Select Child DocType in Label Template'))}</div>`);
        b.append(`<div class="lp-section">${__('Add Object')}</div>`);
        const types = ['Text','Barcode','QR Code','DataMatrix','PDF417','Aztec','Image','Line','Rectangle'];
        const tools = $('<div class="lp-tools"></div>');
        types.forEach(type => tools.append($('<button class="btn btn-xs btn-default">').text('+ ' + __(type)).attr('data-type', type).addClass('lp-add-object')));
        b.append(tools);
        b.append(`<div class="lp-section">${__('Fields')}</div>`);
        if (!fields.length) b.append(`<div class="lp-muted">${__('No fields available. Select a child DocType in Label Template.')}</div>`);
        else {
            b.append(`<input type="text" class="lp-field-search" placeholder="${__('Search fields...')}">`);
            const list = $('<div class="lp-field-list"></div>');
            fields.forEach(f => {
                const row = $('<div class="lp-field-row"></div>').attr('data-search', (f.label + ' ' + f.value).toLowerCase());
                row.append($('<span>').attr('title', field_label(f)).text(field_label(f)));
                row.append($('<button type="button" class="btn btn-xs btn-default">').text(__('Add')).on('click', () => add_object('Text', f.value)));
                list.append(row);
            });
            b.append(list);
            b.find('.lp-field-search').on('input', function () {
                const q = $(this).val().toLowerCase().trim();
                list.find('.lp-field-row').each(function () {
                    $(this).toggleClass('lp-hidden', !!q && $(this).attr('data-search').indexOf(q) === -1);
                });
            });
        }
        b.append(`<div class="lp-section">${__('Layers')}</div><div class="lp-layers"></div>`);
    }

    function default_object(type, fieldname) {
        const count = (doc.objects || []).length;
        const values = {object_type:type, fieldname:fieldname || '', fixed_text:'', barcode_type:'Code 128', barcode_value_mode:'ERPNext Field', font:'0', font_size:28, alignment:'Left', x_mm:2 + (count % 4) * 4, y_mm:2 + Math.floor(count / 4) * 7, width_mm:type === 'Text' ? 35 : 25, height_mm:type === 'Text' ? 7 : 12, rotation:'0', data_matrix_scale:4, image_url:'', image_fit:'Contain', z_index:count + 1};
        if (opts.new_row) return opts.new_row(values);
        return Object.assign({doctype:'Label Template Object'}, values);
    }

    function add_object(type, fieldname) { push_history(); const row = default_object(type, fieldname); if (!opts.new_row) doc.objects.push(row); selected = doc.objects.length - 1; render(); }

    function clone_object(o) {
        const n = clone(o);
        delete n.name;
        n.x_mm = flt(n.x_mm) + 2; n.y_mm = flt(n.y_mm) + 2; n.z_index = doc.objects.length + 1;
        if (opts.new_row) return opts.new_row(n);
        return n;
    }

    function render() {
        if (!doc) return;
        if (!drag && !resize && !first_render) mark_dirty();
        first_render = false;
        const s = scale(), w = Math.max(150, flt(doc.label_width_mm || 100) * s), h = Math.max(100, flt(doc.label_height_mm || 50) * s);
        canvas.css({width:w + 'px', height:h + 'px'}).toggleClass('lp-grid', grid).empty();
        (doc.objects || []).slice().sort((a,b) => (flt(a.z_index)||0) - (flt(b.z_index)||0)).forEach(o => {
            const i = doc.objects.indexOf(o), $o = $('<div class="lp-object"></div>').toggleClass('selected', i === selected).toggleClass('locked', !!o.locked);
            $o.css({left:flt(o.x_mm)*s, top:flt(o.y_mm)*s, width:Math.max(8,flt(o.width_mm||20)*s), height:Math.max(8,flt(o.height_mm||6)*s), zIndex:o.z_index || 1, transform:'rotate(' + (o.rotation || 0) + 'deg)'});
            if (o.object_type === 'Rectangle') $o.css({border:'2px solid var(--text-color)',background:'transparent'});
            else if (o.object_type === 'Line') $o.css({background:'var(--text-color)',height:Math.max(1,flt(o.height_mm || 0.3)*s)});
            else if (o.object_type === 'Image') $o.text(o.image_url ? '' : __('Image / Logo'));
            else if (['Barcode','QR Code','DataMatrix','PDF417','Aztec'].includes(o.object_type)) $o.html('<div style="font-size:10px;text-align:center;width:100%">▦<br>' + esc(o.fieldname || o.fixed_text || 'SAMPLE') + '</div>');
            else $o.text(o.fixed_text || (o.fieldname ? '{{ ' + o.fieldname + ' }}' : __('Text'))).css({fontSize:Math.max(7,flt(o.font_size||28)/3.78*s)+'px',justifyContent:(o.alignment||'Left').toLowerCase()});
            ['nw','ne','sw','se'].forEach(c => $o.append('<span class="lp-handle '+c+'"></span>'));
            $o.on('pointerdown', function(e) { start_pointer(e, i); });
            canvas.append($o);
        });
        render_layers(); render_properties();
    }

    function render_layers() {
        const b = $r.find('.lp-layers').empty();
        (doc.objects || []).slice().reverse().forEach(o => { const i=doc.objects.indexOf(o); b.append($('<div class="lp-layer"></div>').toggleClass('selected',i===selected).attr('data-i',i).text((i+1)+'. '+object_label(o)).on('click',()=>{selected=i;render();})); });
    }

    function options_html(list, current) { return list.map(x => '<option value="'+esc(x)+'" '+(x===current?'selected':'')+'>'+esc(x)+'</option>').join(''); }
    function field_options_html(current) { return '<option value="">-- '+__('Fixed Value')+' --</option>' + fields.map(f=>'<option value="'+esc(f.value)+'" '+(f.value===current?'selected':'')+'>'+esc(field_label(f))+'</option>').join(''); }

    function render_properties() {
        const b=$r.find('.lp-properties').empty(), o=doc.objects && doc.objects[selected];
        if(!o){b.html('<div class="lp-muted">'+__('Select an object on the canvas.')+'</div>');return;}
        b.append(`<div class="lp-field"><label>${__('Object')}</label><select data-p="object_type">${options_html(['Text','Barcode','QR Code','DataMatrix','PDF417','Aztec','Image','Line','Rectangle'],o.object_type)}</select></div>`);
        b.append(`<div class="lp-field"><label>${__('ERPNext Field')}</label><select data-p="fieldname">${field_options_html(o.fieldname)}</select></div>`);
        b.append(`<div class="lp-field"><label>${__('Fixed Text / Value')}</label><input data-p="fixed_text" value="${esc(o.fixed_text||'')}"></div>`);
        if(o.object_type==='Barcode') b.append(`<div class="lp-field"><label>${__('Barcode Type')}</label><select data-p="barcode_type">${options_html(['Code 128','Code 39','Code 93','EAN-8','EAN-13','UPC-A','UPC-E','ITF','Codabar','GS1-128','GS1 DataBar'],o.barcode_type||'Code 128')}</select></div>`);
        b.append(`<div class="lp-g2"><div class="lp-field"><label>${__('X mm')}</label><input type="number" step="0.1" data-p="x_mm" value="${o.x_mm||0}"></div><div class="lp-field"><label>${__('Y mm')}</label><input type="number" step="0.1" data-p="y_mm" value="${o.y_mm||0}"></div></div>`);
        b.append(`<div class="lp-g2"><div class="lp-field"><label>${__('Width mm')}</label><input type="number" step="0.1" data-p="width_mm" value="${o.width_mm||20}"></div><div class="lp-field"><label>${__('Height mm')}</label><input type="number" step="0.1" data-p="height_mm" value="${o.height_mm||6}"></div></div>`);
        b.append(`<div class="lp-g2"><div class="lp-field"><label>${__('Font Size')}</label><input type="number" data-p="font_size" value="${o.font_size||28}"></div><div class="lp-field"><label>${__('Layer')}</label><input type="number" data-p="z_index" value="${o.z_index||1}"></div></div>`);
        b.append(`<div class="lp-field"><label>${__('Alignment')}</label><select data-p="alignment">${options_html(['Left','Center','Right'],o.alignment||'Left')}</select></div>`);
        b.append(`<div class="lp-field"><label>${__('Rotation')}</label><select data-p="rotation">${options_html(['0','90','180','270'],String(o.rotation||'0'))}</select></div>`);
        b.append(`<button class="btn btn-xs btn-default lp-duplicate">${__('Duplicate')}</button> <button class="btn btn-xs btn-default lp-lock">${o.locked?__('Unlock'):__('Lock')}</button>`);
        b.find('[data-p]').on('change input',function(){ const p=$(this).attr('data-p'); push_history(); o[p]=$(this).val(); if(['x_mm','y_mm','width_mm','height_mm','font_size','z_index'].includes(p)) o[p]=flt(o[p]); render(); });
        b.find('.lp-duplicate').on('click',()=>{push_history();const n=clone_object(o);if(!opts.new_row) doc.objects.push(n);selected=doc.objects.length-1;render();});
        b.find('.lp-lock').on('click',()=>{push_history();o.locked=!o.locked;render();});
    }

    function start_pointer(e, i) {
        const o=doc.objects[i]; if(!o || o.locked) return;
        e.preventDefault(); e.stopPropagation(); selected=i;
        const is_handle=$(e.target).hasClass('lp-handle');
        push_history();
        if(is_handle) resize={i:i,corner:$(e.target).attr('class').split(' ').pop(),startX:e.clientX,startY:e.clientY,x:flt(o.x_mm),y:flt(o.y_mm),w:flt(o.width_mm||20),h:flt(o.height_mm||6),scale:scale(),pointerId:e.pointerId};
        else drag={i:i,startX:e.clientX,startY:e.clientY,x:flt(o.x_mm),y:flt(o.y_mm),scale:scale(),pointerId:e.pointerId};
        try { e.target.setPointerCapture(e.pointerId); } catch(err) {}
        render();
    }

    $r.on('pointermove', function(e) {
        if(!drag && !resize) return;
        const state=drag || resize, o=doc.objects[state.i]; if(!o) return;
        const dx=(e.clientX-state.startX)/state.scale, dy=(e.clientY-state.startY)/state.scale;
        if(drag){o.x_mm=Math.max(0,snap_value(state.x+dx));o.y_mm=Math.max(0,snap_value(state.y+dy));}
        else {
            let x=state.x,y=state.y,w=state.w,h=state.h;
            if(state.corner.indexOf('e')>=0) w=Math.max(3,snap_value(state.w+dx));
            if(state.corner.indexOf('s')>=0) h=Math.max(3,snap_value(state.h+dy));
            if(state.corner.indexOf('w')>=0){const nx=snap_value(state.x+dx);w=Math.max(3,state.w-(nx-state.x));x=nx;}
            if(state.corner.indexOf('n')>=0){const ny=snap_value(state.y+dy);h=Math.max(3,state.h-(ny-state.y));y=ny;}
            o.x_mm=Math.max(0,x);o.y_mm=Math.max(0,y);o.width_mm=w;o.height_mm=h;
        }
        render();
    });
    $(document).off('pointerup.' + (opts.ns || 'label_printing_designer')).on('pointerup.' + (opts.ns || 'label_printing_designer'), function(){ if(drag||resize){drag=null;resize=null;render();} });

    $r.on('pointerdown', '.lp-canvas', function(e){ if(e.target===canvas[0]){selected=-1;render();} });
    $r.on('click','.lp-add-object',function(){add_object($(this).attr('data-type'));});
    if (standalone) {
        $r.find('.lp-template').on('change',function(){template_name=$(this).val();if(opts.on_navigate) opts.on_navigate(template_name);load_template();});
        $r.find('.lp-save').on('click', do_save);
    }
    $r.find('.lp-delete').on('click', do_delete);
    $r.find('.lp-copy').on('click', do_copy);
    $r.find('.lp-paste').on('click', do_paste);
    $r.find('.lp-undo').on('click', do_undo);
    $r.find('.lp-redo').on('click', do_redo);
    $r.find('.lp-grid-btn').on('click',function(){grid=!grid;render();});
    $r.find('.lp-snap').on('click',function(){snap=!snap;$(this).toggleClass('btn-primary',snap);});
    $r.find('.lp-zoom-in').on('click',function(){zoom=Math.min(3,zoom+.1);render();$r.find('.lp-zoom').text(Math.round(zoom*100)+'%');});
    $r.find('.lp-zoom-out').on('click',function(){zoom=Math.max(.5,zoom-.1);render();$r.find('.lp-zoom').text(Math.round(zoom*100)+'%');});
    $r.find('.lp-fit').on('click',function(){zoom=1;render();$r.find('.lp-zoom').text('100%');});

    function do_save(){ if(!doc)return; const data=clone(doc); api('frappe.client.save',{doc:data}).then(saved=>{doc=saved;template_name=doc.name;set_status(__('Saved'));$r.find('.lp-template').val(template_name);if(opts.on_navigate) opts.on_navigate(template_name);}).catch(()=>frappe.msgprint(__('Unable to save the label template.'))); }
    function do_delete(){ if(selected<0)return;push_history();doc.objects.splice(selected,1);selected=-1;render(); }
    function do_copy(){ if(selected>=0)clipboard=clone(doc.objects[selected]); }
    function do_paste(){ if(!clipboard)return;push_history();const n=clone_object(clipboard);if(!opts.new_row) doc.objects.push(n);selected=doc.objects.length-1;render(); }
    function do_undo(){ if(!history.length)return;future.push(snapshot());const s=history.pop();doc.objects=JSON.parse(s);selected=Math.min(selected,doc.objects.length-1);render(); }
    function do_redo(){ if(!future.length)return;history.push(snapshot());const s=future.pop();doc.objects=JSON.parse(s);selected=Math.min(selected,doc.objects.length-1);render(); }

    const ns = opts.ns || 'label_printing_designer';
    $(document).off('keydown.' + ns).on('keydown.' + ns, function(e){
        if (!doc || !$.contains($r[0], e.target)) return;
        const tag = (e.target.tagName || '').toLowerCase();
        const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
        const meta = e.ctrlKey || e.metaKey;
        if (typing) {
            if (e.key === 'Escape') e.target.blur();
            return;
        }
        if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); do_undo(); }
        else if (meta && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); do_redo(); }
        else if (meta && e.key.toLowerCase() === 'c') { e.preventDefault(); do_copy(); }
        else if (meta && e.key.toLowerCase() === 'v') { e.preventDefault(); do_paste(); }
        else if (standalone && meta && e.key.toLowerCase() === 's') { e.preventDefault(); do_save(); }
        else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); do_delete(); }
        else if (e.key === 'Escape') { selected = -1; render(); }
    });

    const ready = standalone ? load_templates() : load_template();
    ready.catch(err=>{console.error(err);set_status(__('Unable to load the label template.'));});

    return {
        refresh: () => load_template(),
        destroy: () => { $(document).off('keydown.' + ns); $(document).off('pointerup.' + ns); },
    };
};
