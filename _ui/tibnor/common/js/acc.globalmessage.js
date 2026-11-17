ACC.globalmessage = {
    _autoload: [],
    
    /**
    * Show aletrs/message
    * @param {String}   messageType type of messages.
    * @param {[
    *           { text: '', args: [] }
*            ]}         texts list of texts with args to show.
    * @param {Boolean}  showBtn show close btn.
    */
    messageTpl: function(messageType, texts, showBtn) {
        let btn = showBtn
          ? `<button class="close closeAccAlert" aria-hidden="true" data-dismiss="alert" type="button">&times;</button>`
          : "";
        
        let text = texts[0] && ACC.globalmessage.handleACCTextWithArg(texts[0]);
        let classes = messageType === 'waring' ? 'alert-warning' : 'alert-info';

        if(messageType === 'error') {
            text = `${texts.map(
                (textObj) =>
                `<p>${ACC.globalmessage.handleACCTextWithArg(textObj)}</p>`
            ).join('')}`;
            classes = 'alert-danger';
        }

        return `<div class="global-alerts">
                    <div class="alert ${classes} alert-dismissable getAccAlert">
                        ${btn} ${text}
                    </div>
                </div>`
    },

    handleACCTextWithArg: ({ text, args }) =>
        args?.reduce((acc, arg, i) => acc?.replace(`{${i}}`, arg), text) || text,
    
    getACCText: (str) => str.split(".").reduce((o, i) => o[i], ACC.text),
}