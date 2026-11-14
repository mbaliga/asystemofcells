// window.clackpad is provided by the host. Every call returns a Promise.
clackpad.getConfig().then(function (cfg) {
  document.getElementById('greeting').textContent = 'Hello, ' + (cfg.name || 'world') + '!';
});
document.getElementById('again').addEventListener('click', function () {
  clackpad.toast('Hello again');
});
