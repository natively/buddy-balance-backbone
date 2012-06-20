var BalanceView = Parse.View.extend({
  tagName: "tr",

  template: _.template($('#balance-template').html()),

  initialize: function() {},

  render: function() {
    var rowClass = this.model.get("amount") > 0 ? 'owes-you' : 'owe';
    $(this.el).addClass(rowClass).html(this.template(this.model.toJSON()));
    return this;
  }
})
