// Bản đồ giá: mỗi ghim hiện giá, lọc theo phân khúc giá và khu vực (phường).
(function () {
  var dataEl = document.getElementById('pmData');
  var mapEl = document.getElementById('pmMap');
  if (!dataEl || !mapEl || !window.L) return;

  var data;
  try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var pins = data.pins || [];
  if (!pins.length) return;

  var wrap = document.getElementById('pmWrap');
  var empty = document.getElementById('pmEmpty');
  var state = { tier: '', ward: '' };

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  // ----- bản đồ -----
  var map = L.map(mapEl, { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView([12.2388, 109.1967], 12);
  var street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap',
  });
  var sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, attribution: 'Ảnh: Esri',
  });
  street.addTo(map);
  var isSat = false;

  // Bật cuộn chuột sau khi bấm vào bản đồ (tránh kẹt khi cuộn trang)
  map.on('click', function () { map.scrollWheelZoom.enable(); });
  map.on('mouseout', function () { map.scrollWheelZoom.disable(); });

  // Trên điện thoại: khóa bản đồ cho đến khi chạm, để vuốt trang không bị kẹt
  var lock = document.getElementById('pmLock');
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  function setLocked(v) {
    if (!lock) return;
    lock.hidden = !v;
    if (v) { map.dragging.disable(); } else { map.dragging.enable(); }
  }
  if (coarse) {
    setLocked(true);
    lock.addEventListener('click', function () { setLocked(false); });
  } else if (lock) {
    lock.hidden = true;
  }

  // ----- ghim -----
  function pinIcon(p) {
    var html = '<span class="pm-pin tier-' + (p.tier || 'na') + '">' + p.label.replace(/[<>&"]/g, '') + '</span>';
    return L.divIcon({ className: 'pm-icon', html: html, iconSize: null, iconAnchor: [0, 0], popupAnchor: [0, -34] });
  }

  function popupFor(p) {
    var box = el('div', 'pm-pop');
    if (p.img) {
      var a0 = el('a');
      a0.href = '/san-pham-bds/' + p.slug;
      var im = el('img');
      im.src = p.img; im.alt = ''; im.loading = 'lazy';
      a0.appendChild(im);
      box.appendChild(a0);
    }
    var body = el('div', 'pm-pop-body');
    body.appendChild(el('b', 'pm-pop-price', p.price || 'Liên hệ'));
    var h = el('a', 'pm-pop-title', p.title);
    h.href = '/san-pham-bds/' + p.slug;
    body.appendChild(h);
    var meta = [p.type];
    if (p.area) meta.push(p.area + ' m²');
    if (p.ward) meta.push(p.ward);
    body.appendChild(el('p', 'pm-pop-meta', meta.join(' · ')));
    if (p.address) body.appendChild(el('p', 'pm-pop-addr', '📍 ' + p.address));
    if (p.bank) body.appendChild(el('span', 'pm-pop-bank', 'Hỗ trợ vay'));
    var go = el('a', 'pm-pop-go', 'Xem chi tiết →');
    go.href = '/san-pham-bds/' + p.slug;
    body.appendChild(go);
    box.appendChild(body);
    return box;
  }

  var clusters = L.markerClusterGroup({
    maxClusterRadius: 48,
    showCoverageOnHover: false,
    iconCreateFunction: function (c) {
      var min = 0;
      c.getAllChildMarkers().forEach(function (m) {
        var v = m.options.vnd;
        if (v && (!min || v < min)) min = v;
      });
      var label = min ? 'từ ' + fmt(min) : '';
      return L.divIcon({
        className: 'pm-icon',
        html: '<span class="pm-cluster"><b>' + c.getChildCount() + '</b><small>' + label + '</small></span>',
        iconSize: [58, 58], iconAnchor: [29, 29],
      });
    },
  });
  map.addLayer(clusters);

  function fmt(v) {
    if (v >= 1e9) return (Math.round(v / 1e7) / 100).toString().replace('.', ',') + ' tỷ';
    return Math.round(v / 1e6) + ' tr';
  }

  var markers = pins.map(function (p) {
    var m = L.marker([p.lat, p.lng], { icon: pinIcon(p), vnd: p.vnd, title: p.title, riseOnHover: true });
    m.bindPopup(function () { return popupFor(p); }, { maxWidth: 260, minWidth: 220 });
    m._pin = p;
    return m;
  });

  function visible(p) {
    if (state.tier && p.tier !== state.tier) return false;
    if (state.ward && p.ward !== state.ward) return false;
    return true;
  }

  function render(fit) {
    clusters.clearLayers();
    var shown = markers.filter(function (m) { return visible(m._pin); });
    clusters.addLayers(shown);
    empty.hidden = shown.length > 0;
    if (fit && shown.length) {
      var b = L.latLngBounds(shown.map(function (m) { return m.getLatLng(); }));
      if (shown.length === 1) map.setView(b.getCenter(), 16);
      else map.fitBounds(b.pad(0.2), { maxZoom: 16 });
    }
    refreshCounts();
  }

  // ----- bộ lọc -----
  var tierBox = document.getElementById('pmTiers');
  var wardBox = document.getElementById('pmWards');

  function countWith(over) {
    var s = { tier: state.tier, ward: state.ward };
    for (var k in over) s[k] = over[k];
    return pins.filter(function (p) {
      return (!s.tier || p.tier === s.tier) && (!s.ward || p.ward === s.ward);
    }).length;
  }

  function chip(box, label, onClick) {
    var b = el('button', 'pm-chip');
    b.type = 'button';
    b.appendChild(document.createTextNode(label + ' '));
    var n = el('span', 'pm-n', '0');
    b.appendChild(n);
    b.addEventListener('click', onClick);
    box.appendChild(b);
    return { btn: b, n: n };
  }

  var tierChips = [], wardChips = [];
  tierChips.push({ key: '', c: chip(tierBox, 'Tất cả giá', function () { state.tier = ''; render(true); }) });
  data.tiers.forEach(function (t) {
    tierChips.push({ key: t.key, c: chip(tierBox, t.label, function () { state.tier = t.key; render(true); }) });
  });
  wardChips.push({ key: '', c: chip(wardBox, 'Mọi khu vực', function () { state.ward = ''; render(true); }) });
  (data.wards || []).forEach(function (w) {
    wardChips.push({ key: w, c: chip(wardBox, w.indexOf('Nha Trang') >= 0 && w !== 'Nha Trang' ? 'P. ' + w : (w === 'Nha Trang' ? 'P. Nha Trang' : w), function () { state.ward = w; render(true); }) });
  });

  function refreshCounts() {
    tierChips.forEach(function (x) {
      x.c.n.textContent = countWith({ tier: x.key });
      x.c.btn.classList.toggle('on', state.tier === x.key);
    });
    wardChips.forEach(function (x) {
      x.c.n.textContent = countWith({ ward: x.key });
      x.c.btn.classList.toggle('on', state.ward === x.key);
    });
  }

  // ----- nút công cụ -----
  document.getElementById('pmSat').addEventListener('click', function () {
    isSat = !isSat;
    if (isSat) { map.removeLayer(street); sat.addTo(map); } else { map.removeLayer(sat); street.addTo(map); }
    this.classList.toggle('on', isSat);
  });

  var me = null;
  document.getElementById('pmLoc').addEventListener('click', function () {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(function (pos) {
      var ll = [pos.coords.latitude, pos.coords.longitude];
      if (me) map.removeLayer(me);
      me = L.circleMarker(ll, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(map);
      map.setView(ll, 15);
    });
  });

  var full = document.getElementById('pmFull');
  function setFull(v) {
    wrap.classList.toggle('pm-full', v);
    document.body.classList.toggle('pm-lock-scroll', v);
    full.textContent = v ? '✕' : '⤢';
    if (v) setLocked(false);
    setTimeout(function () { map.invalidateSize(); }, 50);
  }
  full.addEventListener('click', function () { setFull(!wrap.classList.contains('pm-full')); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && wrap.classList.contains('pm-full')) setFull(false);
  });

  render(true);
})();
