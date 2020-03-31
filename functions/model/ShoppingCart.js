class ShoppingCart {
    // product: {id, name, price, summary, image, image_url}
    // quantity: e.g. 1
    //contents = {
    //  product: {...},
    //  qty: 2}
    //}
    constructor() {
        this.contents = [];
    }


    add(product) {
        let found = false;
        for (const item of this.contents)
        {
            if (item.product.id === product.id)
            {
                found = true;
                ++item.qty;
            }
        }

        if (!found)
        {
            this.contents.push({product, qty: 1});
        }
    }

    getTotal(){
        let sum = 0;
        for (const item of this.contents)
        {
            sum += item.qty * item.product.price;
        }
        return sum;
    }

    serialize(){
        return this.contents;
    }

    // obj = ShoppingCart.deserialize(serial_data)
    static deserialize(sdata){
        const cart = new ShoppingCart();
        cart.contents = sdata;
        return cart;
    }
}

module.exports = ShoppingCart;