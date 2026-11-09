// Tự nén ảnh trước khi tải lên: mỗi ảnh còn khoảng 1,5MB, giữ chất lượng cao.
// Ảnh đã nhỏ hơn mức này được giữ nguyên, không nén lại.
(function () {
  var TARGET = 1500000;   // ~1,5MB
  var MAX_SIDE = 2560;    // cạnh dài tối đa (px), đủ nét cho màn hình lớn
  var START_Q = 0.92;
  var MIN_Q = 0.7;

  function mb(n) { return (n / 1048576).toFixed(1).replace('.', ',') + 'MB'; }

  function load(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return createImageBitmap(file); });
    }
    return new Promise(function (ok, fail) {
      var fr = new FileReader();
      fr.onload = function () {
        var im = new Image();
        im.onload = function () { ok(im); };
        im.onerror = fail;
        im.src = fr.result;
      };
      fr.onerror = fail;
      fr.readAsDataURL(file);
    });
  }

  function encode(canvas, q) {
    return new Promise(function (ok) { canvas.toBlob(ok, 'image/jpeg', q); });
  }

  function shrink(file) {
    if (file.size <= TARGET) return Promise.resolve(file);
    return load(file).then(function (img) {
      var w = img.width, h = img.height;
      var scale = Math.min(1, MAX_SIDE / Math.max(w, h));
      var best = null;
      function attempt(q, tries) {
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return encode(canvas, q).then(function (blob) {
          if (!blob) return best;
          best = blob;
          if (blob.size <= TARGET || tries > 12) return blob;
          if (q - 0.06 >= MIN_Q) return attempt(q - 0.06, tries + 1);
          scale *= 0.88;            // đã hạ chất lượng tới mức tối thiểu thì giảm kích thước
          return attempt(0.85, tries + 1);
        });
      }
      return attempt(START_Q, 0).then(function (blob) {
        if (img.close) img.close();
        if (!blob || blob.size >= file.size) return file;
        var name = (file.name || 'anh').replace(/\.[^.]+$/, '') + '.jpg';
        return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified });
      });
    }).catch(function () { return file; });   // không đọc được thì giữ ảnh gốc
  }

  function attach(input) {
    var form = input.form;
    var status = document.createElement('small');
    status.className = 'muted compress-status';
    input.parentNode.appendChild(status);
    var busy = false;

    function lock(on) {
      busy = on;
      if (!form) return;
      Array.prototype.forEach.call(form.querySelectorAll('button:not([type]),button[type=submit]'), function (b) { b.disabled = on; });
    }
    if (form) form.addEventListener('submit', function (e) { if (busy) e.preventDefault(); });

    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files || []);
      if (!files.length || typeof DataTransfer === 'undefined') return;
      var before = files.reduce(function (s, f) { return s + f.size; }, 0);
      lock(true);
      status.textContent = 'Đang nén ' + files.length + ' ảnh, vui lòng đợi...';
      // Nén lần lượt từng ảnh để máy yếu không bị đơ
      var out = [];
      files.reduce(function (p, f) {
        return p.then(function () { return shrink(f).then(function (r) { out.push(r); }); });
      }, Promise.resolve()).then(function () {
        try {
          var dt = new DataTransfer();
          out.forEach(function (f) { dt.items.add(f); });
          input.files = dt.files;
          var after = out.reduce(function (s, f) { return s + f.size; }, 0);
          status.textContent = 'Sẵn sàng tải lên ' + out.length + ' ảnh (' + mb(before) + ' → ' + mb(after) + ').';
        } catch (e) {
          status.textContent = '';
        }
        lock(false);
      });
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('input[type=file][data-compress]'), attach);
})();
