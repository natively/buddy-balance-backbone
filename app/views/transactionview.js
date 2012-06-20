var TransactionView = Parse.View.extend({
  tagName: "tr",
  template: _.template($('#transaction-template').html()),
  initialize: function() {},
  render: function() {
    $(this.el).html(this.template(this.model.toJSON()));
    return this;
  }
});