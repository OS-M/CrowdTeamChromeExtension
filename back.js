var observer = new MutationObserver(function(mutations) {
  var buttons = document.querySelectorAll("button");
  chrome.storage.local.get(["cur_batch"], function(batch_item) {
    chrome.storage.local.get(["can_send"], function(can_send_item) {
      var cur_name = "weiufnwiefubwiufiubiubwefionon"
      var can_send = false;
      if (can_send_item.can_send && can_send_item.can_send === "true") {
        can_send = true;
      }
      if (batch_item.cur_batch) {
        cur_name = batch_item.cur_batch.split(' ').slice(1).join(' ');
      }
      for (var i = 0, l = buttons.length; i < l; i++) {
        if (buttons[i].textContent === "Acknowledge")  {
          buttons[i].remove();
        }
        if (buttons[i].textContent === "Work on this Batch" && 
            !buttons[i].parentNode.textContent.includes(cur_name)) {
          buttons[i].remove();
        }
        if (buttons[i].textContent === "Submit for Review") {
          if (!(buttons[i].parentNode.textContent.includes(cur_name) && can_send)) {
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
