var Transaction = Parse.Object.extend("Transaction", {
  defaults: {
    confirmed: true
  },
  validateSelf: function() {
    return (!isNaN(tAmount) && tUser !== "" );
  }
});