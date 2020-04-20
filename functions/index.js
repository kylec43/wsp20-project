const functions = require('firebase-functions');
const express = require('express');
const app = express();
const path = require('path');

exports.httpReq = functions.https.onRequest(app);

app.use(express.urlencoded({extended: false}));
app.use('/public', express.static(path.join(__dirname, '/static')))

//set template engine
app.set('view engine', 'ejs');

//location of ejs file
app.set('views', './ejsviews');

//frontend programming

function frontendHandler(req, res)
{
    res.sendFile(path.join(__dirname, '/prodadmin/prodadmin.html'));
}
app.get('/login', frontendHandler);
app.get('/home', frontendHandler);
app.get('/add', frontendHandler);
app.get('/show', frontendHandler);

//backend programming

const session = require('express-session');

app.use(session(
    {
    secret: 'string13241234',
    name: '__session',
    saveUninitialized: false,
    resave: false,
    secure: true,
    maxAge: 1000*60*60*2,
    rolling: true,
    }
))

const firebase = require('firebase');

// Your web app's Firebase configuration
var firebaseConfig = {
    apiKey: "AIzaSyAoxJzmVr6BOU3iVl2LzzU1v65n5tsP4e0",
    authDomain: "kylec-wsp20.firebaseapp.com",
    databaseURL: "https://kylec-wsp20.firebaseio.com",
    projectId: "kylec-wsp20",
    storageBucket: "kylec-wsp20.appspot.com",
    messagingSenderId: "782407892888",
    appId: "1:782407892888:web:cb96d70f49a13d12e675ed"
  };
  // Initialize Firebase
firebase.initializeApp(firebaseConfig);

const adminUtil = require('./adminUtil.js');
const Constants = require('./myconstants.js');

app.get('/', auth, getCartMiddleWare, async (req, res) => {
    const cartCount = req.ShoppingCart ? req.ShoppingCart.length : 0;
    const coll = firebase.firestore().collection(Constants.COLL_PRODUCTS);
    
    try {
        let products = [];
        const snapshot = await coll.orderBy("image").limit(11).get();

        /*If there are less than 11 products, that means there are no more products*/
        let hide_next_button = false;
        if(snapshot.size < 11)
        {
            hide_next_button = true;
        }
 
        snapshot.forEach(doc => {
            products.push({id : doc.id, data: doc.data()});
        });

        /*To display 10 elements*/
        if(products.length === 11)
        {
            products.pop();
        }

        let hide_prev_button = true;

        signedIn_cart_not_empty = req.session.signedIn_cart_not_empty ? true : false;
        req.session.signedIn_cart_not_empty = null;

        res.setHeader('Cache-Control', 'private');
        return res.render('storefront.ejs', {error: false, products, user: req.decodedIdToken, cartCount, 
                                            hide_next_button, hide_prev_button, signedIn_cart_not_empty});
    } catch(e) {
        res.setHeader('Cache-Control', 'private');
        return res.render('storefront.ejs', {error: e, user: req.decodedIdToken, cartCount, signedIn_cart_not_empty: false})
    }
})


app.post('/', auth, getCartMiddleWare, async (req, res) => {
    const cartCount = req.ShoppingCart ? req.ShoppingCart.length : 0;
    const coll = firebase.firestore().collection(Constants.COLL_PRODUCTS);

    const first_product = req.body.first_product;
    const last_product = req.body.last_product;    

    /*User pressed next if the last_product was passed*/
    const user_pressed_next = last_product ? true : false;

    try {
        let products = [];


        if (user_pressed_next)
        {
            const snapshot = await coll.orderBy("image").startAfter(last_product).limit(11).get();

            /*If there are less than 11 products, that means there are no more products*/
            let hide_next_button = false;
            if(snapshot.size < 11)
            {
                hide_next_button = true;
            }

            snapshot.forEach(doc => {
                products.push({id : doc.id, data: doc.data()});
            });

            /*To display 10 elements*/
            if(products.length === 11)
            {
                products.pop();
            }

            let hide_prev_button = false;

            res.setHeader('Cache-Control', 'private');
            return res.render('storefront.ejs', {error: false, products, user: req.decodedIdToken, cartCount, 
                                            hide_next_button, hide_prev_button});
        }
        else
        {
            const snapshot = await coll.orderBy("image", "desc").startAfter(first_product).limit(11).get();


            let hide_prev_button = false;
            if(snapshot.size < 11)
            {
                hide_prev_button = true;
            }
            

            snapshot.forEach(doc => {
                products.push({id : doc.id, data: doc.data()});
            });

            if(products.length === 11)
            {
                products.pop();
            }

            products = products.reverse();


            let hide_next_button = false;

            res.setHeader('Cache-Control', 'private');
            return res.render('storefront.ejs', {error: false, products, user: req.decodedIdToken, cartCount,
                                            hide_next_button, hide_prev_button});
        }
    } catch(e) {
        res.setHeader('Cache-Control', 'private');
        return res.render('storefront.ejs', {error: e, user: req.decodedIdToken, cartCount})
    }
})


app.get('/b/about', auth, getCartMiddleWare, (req, res) => {
    const cartCount = req.ShoppingCart ? req.ShoppingCart.length : 0;
    res.setHeader('Cache-Control', 'private');
    return res.render('about.ejs', {user: req.decodedIdToken, cartCount});
})

app.get('/b/contact', auth, getCartMiddleWare, (req, res) => {
    const cartCount = req.ShoppingCart ? req.ShoppingCart.length : 0;
    res.setHeader('Cache-Control', 'private');
    return res.render('contact.ejs', {user: req.decodedIdToken, cartCount});
})

app.get('/b/signin', (req, res) => {
    res.setHeader('Cache-Control', 'private');
    return res.render('signin.ejs', {error: false, user: req.user, cartCount: 0});
})

app.post('/b/signin', async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    const auth = firebase.auth();

    try {
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);        
        const userRecord = await auth.signInWithEmailAndPassword(email, password);
        const idToken = await userRecord.user.getIdToken();
        await auth.signOut();

        req.session.idToken = idToken;
        

        if(userRecord.user.email === Constants.SYSADMINEMAIL)
        {
            res.setHeader('Cache-Control', 'private');
            return res.redirect('/admin/sysadmin');
        }
        else
        {
            var cart_exists = false;
            docRef = firebase.firestore().collection('shopping_carts').doc(userRecord.user.uid);
            await docRef.get().then( doc => {
                if (doc.exists)
                {
                    cart_exists = true;
                }
                return;
            });

            if(cart_exists)
            {
                req.session.signedIn_cart_not_empty = true;
                res.setHeader('Cache-Control', 'private');
                return res.redirect('/')
            }
            else
            {
                res.setHeader('Cache-Control', 'private');
                return res.redirect('/');
            }

        }

    } catch(e) {
        res.setHeader('Cache-Control', 'private');
        return res.render('signin.ejs', {error: e, user: null, cartCount: 0});
    }
})

app.get('/b/signout', async (req, res) => {


    req.session.destroy(err => {
        if (err)
        {
            req.session = null;
            return res.send('Error: sign out (session.destroy error)')
        }
        else
        {
            return res.redirect('/');
        }
    });

})


app.get('/b/profile', authAndRedirectSignIn, getCartMiddleWare, (req, res) => {
    const cartCount = req.ShoppingCart ? req.ShoppingCart.length : 0;
    res.setHeader('Cache-Control', 'private');
    return res.render('profile', {user: req.decodedIdToken, cartCount, orders: false});
})


app.get('/b/signup', (req, res) => {

    return res.render('signup.ejs', {page: 'signup', user: null, error: false, cartCount: 0});

})


const ShoppingCart = require('./model/ShoppingCart.js')

app.post('/b/add2cart', auth, getCartMiddleWare, async (req, res) => {

    if(!req.decodedIdToken)
    {
        res.setHeader('Cache-Control', 'private');
        return res.render('signin.ejs', {error: "Please sign in to add a product to your shopping cart.", user: req.user, cartCount: 0});
    }

    const id = req.body.docId;
    console.log('=========111111===============');
    const collection = firebase.firestore().collection(Constants.COLL_PRODUCTS);
    try {
        const doc = await collection.doc(id).get();
        console.log('=========2222222222===============');

        let cart;
        if (!req.ShoppingCart) {
            console.log('---------------empty!-----------------')
            //first time add to cart
            cart = new ShoppingCart();
        } else {
            cart = ShoppingCart.deserialize(req.ShoppingCart);
        }

        console.log('=========3333333===============');

        const {name, price, summary, image, image_url} = doc.data();
        cart.add({id, name, price, summary, image, image_url});

        req.ShoppingCart = cart.serialize();

        console.log('=========4444444===============');

        var data = {cart: req.ShoppingCart};
        await adminUtil.updateCart(data, req.decodedIdToken.uid);
        console.log('=========55555555555555==============');

        res.setHeader('Cache-Control', 'private');
        return res.redirect('/b/shoppingcart');

    } catch(e) {
        res.setHeader('Cache-Control', 'private');
        return res.send(JSON.stringify(e));
    }
})

app.get('/b/shoppingcart', authAndRedirectSignIn, getCartMiddleWare, async (req, res) => {

    let cart;
    if (!req.ShoppingCart) {
        cart = new ShoppingCart();
    } else {
        cart = ShoppingCart.deserialize(req.ShoppingCart);
    }
    res.setHeader('Cache-Control', 'private');
    return res.render('shoppingcart.ejs', {message: false, cart, user: req.decodedIdToken, cartCount: cart.contents.length});
})

app.post('/b/checkout', authAndRedirectSignIn, getCartMiddleWare, async (req, res) => {
    if (!req.ShoppingCart)
    {
        res.setHeader('Cache-Control', 'private');
        return res.send('Shopping Cart is Empty');
    }
    
    //data format to store in firestore
    // collection: orders
    // {uid, timestamp, cart}
    // cart = [{product, qty}] //contents in shoppingcart

    const data = {
        uid: req.decodedIdToken.uid,
        cart: req.ShoppingCart
    }

    try {
        await adminUtil.checkOut(data);
        adminUtil.deleteCart(req.decodedIdToken.uid);

        res.setHeader('Cache-Control', 'private');
        return res.render('shoppingcart.ejs', 
            {message: 'Checked Out Successfully', cart: new ShoppingCart(), user: req.decodedIdToken, cartCount: 0});
    } catch (e) {
        const cart = ShoppingCart.deserialize(req.ShoppingCart);
        res.setHeader('Cache-Control', 'private');
        return res.render('shoppingcart.ejs', 
            {message: 'Check Out Failed. Try Again Later!', cart, user: req.decodedIdToken, cartCount: cart.contents.length});

    }
})


app.get('/b/orderhistory', authAndRedirectSignIn, async (req, res) => {
    try {

        const orders = await adminUtil.getOrderHistory(req.decodedIdToken);
        res.setHeader('Cache-Control', 'private');
        return res.render('profile.ejs', {user: req.decodedIdToken, cartCount: 0, orders})
    } catch(e) {
        res.setHeader('Cache-Control', 'private');
        return res.send("<h1>Order History Error</h1>");
    }
})

//middleware

async function authAndRedirectSignIn(req, res, next)
{

    try {
        const decodedIdToken = await adminUtil.verifyIdToken(req.session.idToken);
        if (decodedIdToken)
        {
            if (decodedIdToken.uid)
            {
                req.decodedIdToken = decodedIdToken;
                return next();
            }
        }
    } catch (e) {
        console.log('authAndRedirect error', e)    
    }

    res.setHeader('Cache-Control', 'private');
    return res.redirect('/b/signin');

}


async function auth(req, res, next)
{

    try {
        if (req.session && req.session.idToken)
        {
            const decodedIdToken = await adminUtil.verifyIdToken(req.session.idToken)
            req.decodedIdToken = decodedIdToken
        }
        else
        {
            req.decodedIdToken = null;
        }
    } catch(e) {
        req.decodedIdToken = null;
    }
    return next();
}


async function getCartMiddleWare(req, res, next)
{

    try {
        if (req.decodedIdToken.uid)
        {
            req.ShoppingCart = null;

            cart_data = await adminUtil.getCartData(req.decodedIdToken.uid);

            if(cart_data)
            {
                cart = new ShoppingCart();
                cart_data.forEach(d => {
                    for(i = 0; i < d.qty; i++)
                    {
                        cart.add({id: d.product.id, name: d.product.name, price: d.product.price, summary: d.product.summary, image: d.product.image, image_url: d.product.image_url});
                    }
                })

                req.ShoppingCart = cart.serialize();

            }
        }
        else
        {
            req.ShoppingCart = null;
        }
    } catch(e) {
        req.ShoppingCart = null;
    }

    return next();
}


//admin api

app.post('/admin/signup', (req, res) => {
    return adminUtil.createUser(req, res);
})

app.get('/admin/sysadmin', authSysAdmin, (req, res) => {
    return res.render('admin/sysadmin.ejs')
})

app.get('/admin/listUsers', authSysAdmin, (req, res) => {

    return adminUtil.listUsers(req, res);
})

async function authSysAdmin(req, res, next) 
{

    try {
        const decodedIdToken = await adminUtil.verifyIdToken(req.session.idToken);
        if (!decodedIdToken || !decodedIdToken.email || decodedIdToken.email !== Constants.SYSADMINEMAIL) 
        {
            return send('<h1>System Admin Page: Access Denied!</h1>');
        }
        if (decodedIdToken.uid)
        {
            req.decodedIdToken = decodedIdToken;
            return next();
        }

        return res.send('<h1>System Admin Page: Access Denied!</h1>');
        
    } catch (e) {
        return res.send('<h1>System Admin Page: Access Denied!</h1>');
    }

}

//test code

app.get('/test_login', (req, res) => {
    res.sendFile(path.join(__dirname, '/static/html/login.html'));
})


app.post('/test_signIn', (req, res) => {

    const email = req.body.email;
    const password = req.body.pass;

//    let page = `
//    <h1>(POST)</h1>
//    <h2>You entered ${email} for the email</h2>
//    <h2> You entered ${password} for the password</h2>
//    `
//    res.send(page);

    const obj = {
        a: email,
        b: password,
        c: '<h1>login success!</h1>',
        start: 1,
        end: 10
    }
    res.render('home', obj);

})

app.get('/test_signIn', (req, res) => {
    const email = req.query.email;
    const password = req.query.pass;
    let page = `
    <h1>(GET)</h1>
    <h2>You entered ${email} for the email</h2>
    <h2> You entered ${password} for the password</h2>
    `
    res.send(page);
})


app.get('/test', (req, res) => {
    const date = new Date().toString();
    let page = `
        <h1>Current date on server is ${date}</h1>
    `

    res.header('refresh', 1);
    res.send(page);
})


app.get('/test2', (req, res) => {
    res.redirect('http://uco.edu');
})