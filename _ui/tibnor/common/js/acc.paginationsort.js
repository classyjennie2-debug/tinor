ACC.paginationsort = {

    downUpKeysPressed: false,

    bindAll: function () {
        this.bindPaginationSort();
    },
    bindPaginationSort: function () {
        ACC.paginationsort.bindSortForm($('#sortForm1'));
        ACC.paginationsort.bindSortForm($('#sortForm2'));
    },
    bindSortForm: function (sortForm) {
        sortForm.find("select").select2();
        sortForm.change(function (e) {
            if (!ACC.paginationsort.downUpPressed) {
                const q = $(this).find('input[name="q"]');
                if (q.length > 0) {
                    const arr = q.val().split(':');
                    arr.splice(1, 1, e.target.value);
                    const newVal = arr.join(':');
                    q.val(newVal)
                }
                this.submit();
            }
            ACC.paginationsort.downUpPressed = false;
        });
    },
    sortFormIEFix: function (sortOptions, selectedOption) {
        sortOptions.keydown(function (e) {
            // Pressed up or down keys
            if (e.keyCode === 38 || e.keyCode === 40) {
                ACC.paginationsort.downUpPressed = true;
            }
            // Pressed enter
            else if (e.keyCode === 13 && selectedOption !== $(this).val()) {
                $(this).parent().submit();
            }
            // Any other key
            else {
                ACC.paginationsort.downUpPressed = false;
            }
        });
    }
};

$(document).ready(function () {
    ACC.paginationsort.bindAll();
});
