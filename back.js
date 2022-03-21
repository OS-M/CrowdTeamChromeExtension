var observer = new MutationObserver(function(mutations) {
  var buttons = document.querySelectorAll("button");
  // alert(1);
  chrome.storage.local.get(["cur_batch"], function(batch_item) {
    chrome.storage.local.get(["can_send"], function(can_send_item) {
      var cur_name = "weiufnwiefubwiufiubiubwefionon"
      var can_send = false;
      if (can_send_item.can_send && can_send_item.can_send === "true") {
        can_send = true;
      }
      if (batch_item.cur_batch) {
        cur_name = batch_item.cur_batch.split(' ').slice(1, -1).join('').replaceAll(' ', '');
      }
      for (var i = 0, l = buttons.length; i < l; i++) {
        var content = buttons[i].parentNode.textContent.replaceAll(' ', '');
        if (buttons[i].textContent === "Acknowledge")  {
          buttons[i].remove();
        }
        if (buttons[i].textContent === "Work on this Batch" && 
            !content.includes(cur_name)) {
          buttons[i].remove();
        }
        if (buttons[i].textContent === "Submit for Review") {
          if (!(content.includes(cur_name) && can_send)) {
              buttons[i].remove();
          }
        }
      }
    });
  });
})

observer.observe(document, { 
  childList: true,
  subtree: true
});
