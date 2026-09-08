frappe.pages['label-designer'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({parent: wrapper, title: __('Label Designer'), single_column: true});
    const root = $(wrapper).find('.layout-main-section');
    root.html(`
<style>
.lpd{display:flex;flex-direction:column;gap:8px;height:calc(100vh - 130px);min-height:700px}.lpd-top{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.lpd-top .lpd-status{margin-left:auto;color:var(--text-muted);font-size:12px}.lpd-main{display:grid;grid-template-columns:210px minmax(520px,1fr) 310px;gap:8px;flex:1;min-height:0}.lpd-panel{border:1px solid var(--border-color);border-radius:7px;background:var(--card-bg);overflow:hidden;min-height:0}.lpd-head{padding:8px 10px;border-bottom:1px solid var(--border-color);font-weight:600}.lpd-body{padding:8px;overflow:auto;height:calc(100% - 38px)}.lpd-tools{display:grid;grid-template-columns:1fr 1fr;gap:5px}.lpd-tools button{white-space:nowrap}.lpd-section{font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin:12px 0 5px}.lpd-canvas-wrap{height:100%;overflow:auto;background:var(--subtle-fg);padding:35px;display:flex;justify-content:center;align-items:flex-start}.lpd-canvas{position:relative;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.22);flex:none;transform-origin:top left}.lpd-grid-bg{background-image:linear-gradient(#ddd 1px,transparent 1px),linear-gradient(90deg,#ddd 1px,transparent 1px);background-size:5px 5px}.lpd-obj{position:absolute;box-sizing:border-box;border:1px dashed #999;overflow:visible;cursor:move;user-select:none;background:rgba(255,255,255,.82);display:flex;align-items:center;justify-content:flex-start;white-space:nowrap}.lpd-obj.selected{border:2px solid var(--primary-color);box-shadow:0 0 0 1px var(--primary-color)}.lpd-obj.locked{cursor:not-allowed}.lpd-handle{position:absolute;width:7px;height:7px;background:var(--primary-color);border:1px solid #fff;border-radius:2px;display:none}.lpd-obj.selected .lpd-handle{display:block}.lpd-handle.nw{left:-5px;top:-5px;cursor:nwse-resize}.lpd-handle.ne{right:-5px;top:-5px;cursor:nesw-resize}.lpd-handle.sw{left:-5px;bottom:-5px;cursor:nesw-resize}.lpd-handle.se{right:-5px;bottom:-5px;cursor:nwse-resize}.lpd-obj img{width:100%;height:100%;object-fit:contain;pointer-events:none}.lpd-barcode-canvas{max-width:100%;max-height:100%}.lpd-field{margin-bottom:7px}.lpd-field label{font-size:11px;color:var(--text-muted);display:block;margin-bottom:2px}.lpd-field input,.lpd-field select{width:100%;padding:5px;border:1px solid var(--border-color);border-radius:4px;background:var(--control-bg)}.lpd-g2{display:grid;grid-template-columns:1fr 1fr;gap:6px}.lpd-layer{padding:6px;border-bottom:1px solid var(--border-color);cursor:pointer;font-size:12px}.lpd-layer.selected{background:var(--control-bg);font-weight:600}.lpd-muted{font-size:11px;color:var(--text-muted)}.lpd-nav{display:grid;grid-template-columns:1fr 1fr;gap:4px}.lpd-nav a{padding:6px 7px;border:1px solid var(--border-color);border-radius:4px;text-decoration:none;color:var(--text-color);font-size:11px}.lpd-nav a:hover{background:var(--control-bg)}@media(max-width:1150px){.lpd-main{grid-template-columns:185px 1fr}.lpd-props-panel{grid-column:1/-1;height:300px}}
</style>
<div class="lpd">
  <div class="lpd-top">
    <select class="form-control input-sm lpd-template" style="width:270px"></select>
    <button class="btn btn-sm btn-primary lpd-save"><i class="fa fa-save"></i> ${__('Save')}</button>
    <button class="btn btn-sm btn-default lpd-undo" title="Undo">↶</button><button class="btn btn-sm btn-default lpd-redo" title="Redo">↷</button>
    <button class="btn btn-sm btn-default lpd-cut">${__('Cut')}</button><button class="btn btn-sm btn-default lpd-copy">${__('Copy')}</button><button class="btn btn-sm btn-default lpd-paste">${__('Paste')}</button>
    <button class="btn btn-sm btn-default lpd-delete">${__('Delete')}</button><button class="btn btn-sm btn-default lpd-duplicate">${__('Duplicate')}</button>
    <button class="btn btn-sm btn-default lpd-grid">${__('Grid')}</button><button class="btn btn-sm btn-default lpd-snap">${__('Snap')}</button>
    <button class="btn btn-sm btn-default lpd-zout">−</button><span class="lpd-zoom">100%</span><button class="btn btn-sm btn-default lpd-zin">+</button>
    <button class="btn btn-sm btn-default lpd-fit">${__('Fit')}</button><button class="btn btn-sm btn-success lpd-preview">${__('Preview')}</button>
    <span class="lpd-status"></span>
  </div>
  <div class="lpd-main">
    <div class="lpd-panel"><div class="lpd-head">${__('Design')}</div><div class="lpd-body">
      <div class="lpd-section">${__('Objects')}</div><div class="lpd-tools">
        <button class="btn btn-xs btn-default lpd-tool" data-type="Text">+ ${__('Text')}</button><button class="btn btn-xs btn-default lpd-tool" data-type="Barcode">+ ${__('Barcode')}</button>
        <button class="btn btn-xs btn-default lpd-tool" data-type="QR Code">+ ${__('QR Code')}</button><button class="btn btn-xs btn-default lpd-tool" data-type="DataMatrix">+ ${__('DataMatrix')}</button>
        <button class="btn btn-xs btn-default lpd-tool" data-type="PDF417">+ ${__('PDF417')}</button><button class="btn btn-xs btn-default lpd-tool" data-type="Aztec">+ ${__('Aztec')}</button>
        <button class="btn btn-xs btn-default lpd-tool" data-type="Image">+ ${__('Image')}</button><button class="btn btn-xs btn-default lpd-tool" data-type="Line">+ ${__('Line')}</button>
        <button class="btn btn-xs btn-default lpd-tool" data-type="Rectangle">+ ${__('Rectangle')}</button>
      </div>
      <div class="lpd-section">${__('Alignment')}</div><div class="lpd-tools">
        <button class="btn btn-xs btn-default lpd-align" data-a="left">← ${__('Left')}</button><button class="btn btn-xs btn-default lpd-align" data-a="center">↔ ${__('Center')}</button>
        <button class="btn btn-xs btn-default lpd-align" data-a="right">${__('Right')} →</button><button class="btn btn-xs btn-default lpd-align" data-a="top">↑ ${__('Top')}</button>
        <button class="btn btn-xs btn-default lpd-align" data-a="middle">↕ ${__('Middle')}</button><button class="btn btn-xs btn-default lpd-align" data-a="bottom">${__('Bottom')} ↓</button>
      </div>
      <div class="lpd-tools" style="margin-top:5px"><button class="btn btn-xs btn-default lpd-layerop" data-a="front">${__('Bring Front')}</button><button class="btn btn-xs btn-default lpd-layerop" data-a="back">${__('Send Back')}</button><button class="btn btn-xs btn-default lpd-layerop" data-a="up">${__('Forward')}</button><button class="btn btn-xs btn-default lpd-layerop" data-a="down">${__('Backward')}</button></div>
      <div class="lpd-section">${__('Documents')}</div><div class="lpd-nav">
        <a href="#" data-route="label-template">${__('Label Templates')}</a><a href="#" data-route="manage-printer">${__('Printers')}</a>
        <a href="#" data-route="label-print-job">${__('Print Jobs')}</a><a href="#" data-route="label-print-log">${__('Print Logs')}</a>
        <a href="#" data-route="label-template-object">${__('Design Objects')}</a><a href="#" data-route="label-printing">${__('Label Printing')}</a>
      </div>
      <div class="lpd-section">${__('Layers')}</div><div class="lpd-layers"></div>
    </div></div>
    <div class="lpd-panel"><div class="lpd-head">${__('Label Canvas')}</div><div class="lpd-canvas-wrap"><div class="lpd-canvas lpd-grid-bg"></div></div></div>
    <div class="lpd-panel lpd-props-panel"><div class="lpd-head">${__('Properties')}</div><div class="lpd-body lpd-props"></div></div>
  </div>
</div>`);

    const $r = root, canvas = $r.find('.lpd-canvas');
    let name = frappe.get_route()[1] || '', doc = null, selected = -1, zoom = 1, grid = true, snap = true, fields = [], drag = null, resize = null, history = [], future = [], clipboard = null;
    const esc = v => frappe.utils.escape_html(String(v == null ? '' : v));
    const call = (method, args) => new Promise((resolve, reject) => frappe.call({method, args, callback: r => resolve(r.message), error: reject}));
    const clone = o => JSON.parse(JSON.stringify(o));
    const snapshot = () => JSON.stringify(doc.objects || []);
    function pushHistory() { history.push(snapshot()); if (history.length > 40) history.shift(); future = []; }
    function restore(s) { doc.objects = JSON.parse(s || '[]'); selected = Math.min(selected, doc.objects.length - 1); render(); }
    function mm(v) { return Math.round(flt(v) * 10) / 10; }
    function sc() { return Math.max(.7, Math.min(6, 900 / Math.max(1, flt(doc.label_width_mm || 100)))) * zoom; }
    function snapv(v) { return snap ? Math.round(v * 2) / 2 : mm(v); }
    function obj_label(o) { return o.object_type === 'Image' ? __('Image') : (o.fixed_text || o.fieldname || o.object_type); }
    function field_options(cur) { return `<option value="">-- ${__('Fixed Value')} --</option>` + fields.map(f => `<option value="${esc(f.value)}" ${f.value === cur ? 'selected' : ''}>${esc((f.group ? f.group + ' · ' : '') + (f.label || f.value))}</option>`).join(''); }
    function barcode_id(o) { if (o.object_type === 'Barcode') return ({'Code 128':'code128','Code 39':'code39','Code 93':'code93','EAN-8':'ean8','EAN-13':'ean13','UPC-A':'upca','UPC-E':'upce','ITF':'interleaved2of5','Codabar':'rationalizedCodabar','GS1-128':'gs1-128','GS1 DataBar':'databaromni'})[o.barcode_type || 'Code 128'] || 'code128'; return ({'QR Code':'qrcode','DataMatrix':'datamatrix','PDF417':'pdf417','Aztec':'azteccode'})[o.object_type]; }
    function draw_code(o, el) { const c = document.createElement('canvas'); c.className='lpd-barcode-canvas'; el.append(c); if (!window.BWIPJS) { el.append($('<span>').text(o.fieldname || o.fixed_text || 'SAMPLE')); return; } try { window.BWIPJS.toCanvas(c,{bcid:barcode_id(o),text:String(o.fixed_text || o.fieldname || 'SAMPLE'),scale:Math.max(1,Math.min(6,flt(o.data_matrix_scale)||3)),includetext:o.object_type==='Barcode',paddingwidth:1,paddingheight:1}); } catch(e) { el.text(o.object_type + ' SAMPLE'); } }
    function visual(o, el, scale) {
        el.empty();
        if (['Barcode','QR Code','DataMatrix','PDF417','Aztec'].includes(o.object_type)) draw_code(o, el);
        else if (o.object_type === 'Image') { if (o.image_url) el.html(`<img src="${esc(o.image_url)}">`); else el.text(__('Image / Logo')); }
        else if (o.object_type === 'Line') { el.css({background:'var(--text-color)',height:Math.max(1,flt(o.height_mm||.3)*scale)}); }
        else if (o.object_type === 'Rectangle') { el.css({border:'2px solid var(--text-color)',background:'transparent'}); }
        else { el.text(o.fixed_text || (o.fieldname ? `{{ ${o.fieldname} }}` : __('Text'))); el.css({fontSize:Math.max(7,flt(o.font_size||28)/3.78*scale)+'px',justifyContent:(o.alignment||'Left').toLowerCase()}); }
    }
    function render() {
        if (!doc) return;
        const scale = sc(), w = Math.max(140,flt(doc.label_width_mm||100)*scale), h = Math.max(100,flt(doc.label_height_mm||50)*scale);
        canvas.css({width:w,height:h}); canvas.toggleClass('lpd-grid-bg',grid); canvas.empty();
        (doc.objects || []).slice().sort((a,b)=>(flt(a.z_index)||0)-(flt(b.z_index)||0)).forEach((o) => {
            const i = doc.objects.indexOf(o), el = $(`<div class="lpd-obj ${i===selected?'selected':''} ${o.locked?'locked':''}"><span class="lpd-handle nw"></span><span class="lpd-handle ne"></span><span class="lpd-handle sw"></span><span class="lpd-handle se"></span></div>`);
            el.css({left:flt(o.x_mm)*scale,top:flt(o.y_mm)*scale,width:Math.max(6,flt(o.width_mm||20)*scale),height:Math.max(6,flt(o.height_mm||6)*scale),transform:`rotate(${flt(o.rotation||0)}deg)`,zIndex:o.z_index||1});
            visual(o,el,scale);
            el.on('mousedown', e => {
                if (e.which !== 1 || o.locked) return;
                e.stopPropagation(); selected=i;
                if ($(e.target).hasClass('lpd-handle')) { resize={i,corner:e.target.className.split(' ')[1],x:e.clientX,y:e.clientY,x0:flt(o.x_mm),y0:flt(o.y_mm),w0:flt(o.width_mm||20),h0:flt(o.height_mm||6)}; pushHistory(); }
                else { drag={i,x:e.clientX,y:e.clientY,x0:flt(o.x_mm),y0:flt(o.y_mm)}; pushHistory(); }
                renderProps(); renderLayers();
            });
            canvas.append(el);
        });
        renderLayers(); renderProps();
    }
    function renderLayers() { const b=$r.find('.lpd-layers').empty(); (doc.objects||[]).slice().reverse().forEach(o=>{const i=doc.objects.indexOf(o); b.append(`<div class="lpd-layer ${i===selected?'selected':''}" data-i="${i}">${i+1}. ${esc(obj_label(o))}</div>`);}); }
    function renderProps() {
        const b=$r.find('.lpd-props').empty(), o=doc.objects && doc.objects[selected];
        if(!o){b.html(`<div class="lpd-muted">${__('Select an object to edit its properties.')}</div>`);return;}
        b.html(`<div class="lpd-field"><label>${__('Object')}</label><select data-p="object_type">${['Text','Barcode','QR Code','DataMatrix','PDF417','Aztec','Image','Line','Rectangle'].map(x=>`<option ${x===o.object_type?'selected':''}>${x}</option>`).join('')}</select></div>
        <div class="lpd-field"><label>${__('ERPNext Field')}</label><select data-p="fieldname">${field_options(o.fieldname)}</select></div>
        <div class="lpd-field"><label>${__('Fixed Value / Text')}</label><input data-p="fixed_text" value="${esc(o.fixed_text||'')}"></div>
        <div class="lpd-field lpd-bc"><label>${__('Barcode Type')}</label><select data-p="barcode_type">${['Code 128','Code 39','Code 93','EAN-8','EAN-13','UPC-A','UPC-E','ITF','Codabar','GS1-128','GS1 DataBar'].map(x=>`<option ${x===(o.barcode_type||'Code 128')?'selected':''}>${x}</option>`).join('')}</select></div>
        <div class="lpd-field lpd-img"><label>${__('Image / Logo')}</label><div class="image-upload"></div></div>
        <div class="lpd-g2"><div class="lpd-field"><label>X (mm)</label><input type="number" step="0.1" data-p="x_mm" value="${o.x_mm||0}"></div><div class="lpd-field"><label>Y (mm)</label><input type="number" step="0.1" data-p="y_mm" value="${o.y_mm||0}"></div>
        <div class="lpd-field"><label>Width (mm)</label><input type="number" step="0.1" data-p="width_mm" value="${o.width_mm||20}"></div><div class="lpd-field"><label>Height (mm)</label><input type="number" step="0.1" data-p="height_mm" value="${o.height_mm||6}"></div>
        <div class="lpd-field"><label>${__('Rotation')}</label><select data-p="rotation">${[0,90,180,270].map(x=>`<option ${String(x)===String(o.rotation||0)?'selected':''}>${x}</option>`).join('')}</select></div><div class="lpd-field"><label>${__('Font Size')}</label><input type="number" data-p="font_size" value="${o.font_size||28}"></div>
        <div class="lpd-field"><label>${__('Alignment')}</label><select data-p="alignment">${['Left','Center','Right'].map(x=>`<option ${x===(o.alignment||'Left')?'selected':''}>${x}</option>`).join('')}</select></div><div class="lpd-field"><label>${__('Layer')}</label><input type="number" data-p="z_index" value="${o.z_index||1}"></div></div>
        <div class="lpd-field"><label><input type="checkbox" data-p="locked" ${o.locked?'checked':''}> ${__('Lock Object')}</label></div>
        <button class="btn btn-xs btn-danger lpd-prop-delete">${__('Delete Object')}</button>`);
        b.find('.lpd-bc').toggle(o.object_type==='Barcode'); b.find('.lpd-img').toggle(o.object_type==='Image');
        b.find('[data-p]').on('change input',function(){ const p=$(this).data('p'); let v=$(this).is(':checkbox')?$(this).prop('checked'):$(this).val(); if(['x_mm','y_mm','width_mm','height_mm','font_size','z_index'].includes(p))v=flt(v); if(['x_mm','y_mm','width_mm','height_mm'].includes(p))v=mm(v); o[p]=v; render(); });
        if(o.object_type==='Image'){ const up=new frappe.ui.form.ControlAttach({df:{fieldtype:'Attach Image',fieldname:'image_url'},parent:b.find('.image-upload'),render_input:true}); up.set_value(o.image_url||''); up.$input.on('change',()=>{o.image_url=up.get_value();render();}); }
        b.find('.lpd-prop-delete').on('click',()=>delete_selected());
    }
    function delete_selected(){if(selected<0||!doc.objects[selected])return;pushHistory();doc.objects.splice(selected,1);selected=Math.min(selected,doc.objects.length-1);render();}
    function add(type){pushHistory();doc.objects=doc.objects||[];doc.objects.push({object_type:type,fieldname:'',fixed_text:type==='Text'?'Text':'',barcode_type:'Code 128',barcode_value_mode:'ERPNext Field',font:'0',font_size:28,alignment:'Left',x_mm:3,y_mm:3,width_mm:type==='Text'?35:25,height_mm:type==='Text'?7:18,rotation:'0',data_matrix_scale:4,image_fit:'Contain',z_index:doc.objects.length+1,locked:0});selected=doc.objects.length-1;render();}
    function align(a){if(selected<0)return;const o=doc.objects[selected], w=flt(doc.label_width_mm),h=flt(doc.label_height_mm);pushHistory();if(a==='left')o.x_mm=0;if(a==='center')o.x_mm=(w-flt(o.width_mm))/2;if(a==='right')o.x_mm=w-flt(o.width_mm);if(a==='top')o.y_mm=0;if(a==='middle')o.y_mm=(h-flt(o.height_mm))/2;if(a==='bottom')o.y_mm=h-flt(o.height_mm);render();}
    function layerop(a){if(selected<0)return;pushHistory();const o=doc.objects[selected], max=Math.max(0,...doc.objects.map(x=>flt(x.z_index)||0));if(a==='front')o.z_index=max+1;if(a==='back')o.z_index=0;if(a==='up')o.z_index=(flt(o.z_index)||0)+1;if(a==='down')o.z_index=Math.max(0,(flt(o.z_index)||0)-1);render();}
    async function load(){
        if(!name){const rows=await call('frappe.client.get_list',{doctype:'Label Template',fields:['name','template_name'],filters:{status:['!=','Archived']},limit_page_length:100});$r.find('.lpd-template').html((rows||[]).map(x=>`<option value="${esc(x.name)}">${esc(x.template_name||x.name)}</option>`).join(''));if(rows&&rows.length)name=rows[0].name;}else $r.find('.lpd-template').html(`<option value="${esc(name)}">${esc(name)}</option>`);
        if(!name){$r.find('.lpd-status').text(__('Create a Label Template first.'));return;}
        doc=await call('frappe.client.get',{doctype:'Label Template',name}); if(!doc)return;
        if(!doc.objects)doc.objects=[];
        if(doc.source_doctype){fields=await call('label_printing.api.get_doctype_fields',{doctype:doc.source_doctype,child_table:doc.source_child_table})||[];}
        if(!window.BWIPJS) await new Promise(resolve=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/bwip-js@4.5.1/dist/bwip-js-min.js';s.onload=resolve;s.onerror=resolve;document.head.appendChild(s);});
        $r.find('.lpd-status').text(`${doc.source_doctype||''} · ${doc.source_child_table||__('No child table')} · ${doc.label_width_mm||0} × ${doc.label_height_mm||0} mm`);render();
    }
    $r.on('click','.lpd-tool',function(){add($(this).data('type'));});
    $r.on('click','.lpd-layer',function(){selected=Number($(this).data('i'));render();});
    $r.on('click','.lpd-align',function(){align($(this).data('a'));});
    $r.on('click','.lpd-layerop',function(){layerop($(this).data('a'));});
    $r.on('click','.lpd-nav a',function(e){e.preventDefault();frappe.set_route($(this).data('route'));});
    $r.on('click','.lpd-delete,.lpd-prop-delete',delete_selected);
    $r.on('click','.lpd-duplicate',function(){if(selected<0)return;pushHistory();const o=clone(doc.objects[selected]);o.x_mm=mm(flt(o.x_mm)+3);o.y_mm=mm(flt(o.y_mm)+3);o.z_index=Math.max(...doc.objects.map(x=>flt(x.z_index)||0))+1;doc.objects.push(o);selected=doc.objects.length-1;render();});
    $r.on('click','.lpd-copy',()=>{if(selected>=0)clipboard=clone(doc.objects[selected]);});
    $r.on('click','.lpd-cut',()=>{if(selected>=0){clipboard=clone(doc.objects[selected]);delete_selected();}});
    $r.on('click','.lpd-paste',()=>{if(!clipboard)return;pushHistory();const o=clone(clipboard);o.x_mm=mm(flt(o.x_mm)+3);o.y_mm=mm(flt(o.y_mm)+3);doc.objects.push(o);selected=doc.objects.length-1;render();});
    $r.on('click','.lpd-grid',()=>{grid=!grid;render();}); $r.on('click','.lpd-snap',()=>{snap=!snap;$r.find('.lpd-snap').toggleClass('btn-primary',snap);});
    $r.on('click','.lpd-zin',()=>{zoom=Math.min(3,zoom+.1);$r.find('.lpd-zoom').text(Math.round(zoom*100)+'%');render();});
    $r.on('click','.lpd-zout',()=>{zoom=Math.max(.5,zoom-.1);$r.find('.lpd-zoom').text(Math.round(zoom*100)+'%');render();});
    $r.on('click','.lpd-fit',()=>{zoom=1;$r.find('.lpd-zoom').text('100%');render();});
    $r.on('click','.lpd-save',async()=>{try{await call('frappe.client.save',{doc});frappe.show_alert({message:__('Template saved'),indicator:'green'});}catch(e){frappe.msgprint(__('Unable to save template.'));}});
    $r.on('click','.lpd-preview',()=>{frappe.set_route('label-template',doc.name);});
    $r.on('click','.lpd-undo',()=>{if(!history.length)return;future.push(snapshot());restore(history.pop());});
    $r.on('click','.lpd-redo',()=>{if(!future.length)return;history.push(snapshot());restore(future.pop());});
    $(document).on('mousemove.labeldesigner',e=>{
        if(selected<0||!doc)return; const o=doc.objects[selected], s=sc();
        if(drag){o.x_mm=snapv(Math.max(0,drag.x0+(e.clientX-drag.x)/s));o.y_mm=snapv(Math.max(0,drag.y0+(e.clientY-drag.y)/s));render();}
        if(resize){const dx=(e.clientX-resize.x)/s,dy=(e.clientY-resize.y)/s;let x=resize.x0,y=resize.y0,w=resize.w0,h=resize.h0;if(resize.corner.includes('e'))w=Math.max(2,resize.w0+dx);if(resize.corner.includes('s'))h=Math.max(2,resize.h0+dy);if(resize.corner.includes('w')){x=resize.x0+dx;w=Math.max(2,resize.w0-dx);}if(resize.corner.includes('n')){y=resize.y0+dy;h=Math.max(2,resize.h0-dy);}o.x_mm=snapv(Math.max(0,x));o.y_mm=snapv(Math.max(0,y));o.width_mm=snapv(w);o.height_mm=snapv(h);render();}
    }).on('mouseup.labeldesigner',()=>{drag=null;resize=null;});
    $(document).on('keydown.labeldesigner',e=>{if(selected<0||!doc)return;if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const o=doc.objects[selected],step=e.shiftKey?5:1;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();pushHistory();if(e.key==='ArrowLeft')o.x_mm=Math.max(0,flt(o.x_mm)-step);if(e.key==='ArrowRight')o.x_mm=Math.min(flt(doc.label_width_mm)-flt(o.width_mm),flt(o.x_mm)+step);if(e.key==='ArrowUp')o.y_mm=Math.max(0,flt(o.y_mm)-step);if(e.key==='ArrowDown')o.y_mm=Math.min(flt(doc.label_height_mm)-flt(o.height_mm),flt(o.y_mm)+step);render();}if(e.key==='Delete')delete_selected();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){$r.find('.lpd-duplicate').click();}});
    load();
};
