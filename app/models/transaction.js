var Transaction = Parse.Object.extend("Transaction", {
  defaults: {
    confirmed: false
  },
  validateSelf: function() {
    return (!isNaN(tAmount) && tUser !== "" );
  }
});