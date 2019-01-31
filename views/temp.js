// PURCHASE
app.post('/pets/:id/purchase', (req, res) => {
  console.log(req.body);
  // Set your secret key: remember to change this to your live secret key in production
  // See your keys here: https://dashboard.stripe.com/account/apikeys
  var stripe = require("stripe")(process.env.PRIVATE_STRIPE_API_KEY);

  // Token is created using Checkout or Elements!
  // Get the payment token ID submitted by the form:
  const token = req.body.stripeToken; // Using Express

  const charge = stripe.charges.create({
    amount: 999,
    currency: 'usd',
    description: 'Example charge',
    source: token,
  }).then(() => {
    res.redirect(`/pets/${req.params.id}`);
  });
});
