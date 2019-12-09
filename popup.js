
// chrome.storage.sync.get('color', function(data) {
//     changeColor.style.backgroundColor = data.color;
//     changeColor.setAttribute('value', data.color);
    
// });

document.getElementById('clearCache').onclick = function(element) {
  chrome.runtime.sendMessage({ id: "clearCache" });
};

document.getElementById('submit').onclick = function(element) {
  var cc = document.getElementById('cc');
  var ac = document.getElementById('ac');
  var hc = document.getElementById('hc');

  var reg = /#[\dABCDF]{6}/i;
  if(reg.test(cc.value) || cc.value === ""){
    cc.setCustomValidity("");
  }
  else{
    cc.setCustomValidity("Incorect format expected '#123456'");
  }
  if(reg.test(ac.value) || ac.value === ""){
    ac.setCustomValidity("");
  }
  else{
    ac.setCustomValidity("Incorect format expected '#123456'");
  }
  if(reg.test(hc.value) || hc.value === ""){
    hc.setCustomValidity("");
  }
  else{
    hc.setCustomValidity("Incorect format expected '#123456'");
  }
  if(document.getElementById('form').checkValidity()){
    chrome.runtime.sendMessage({ id: "changeColors", cc: cc.value, ac: ac.value, hc: hc.value});
  }

};