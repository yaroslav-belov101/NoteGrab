const params = new URLSearchParams(window.location.search);
const file = params.get('file');
document.getElementById('reader-frame').src = file;



