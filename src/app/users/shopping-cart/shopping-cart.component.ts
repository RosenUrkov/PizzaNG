import { Router } from '@angular/router';
import { AlerterService } from './../../core/alerter/alerter.service';
import { Cart } from './../../models/Cart';
import { CookieService } from './../../core/cookie/cookie.service';
import { NotificatorService } from './../../core/notificator/notificator.service';
import { UsersDataService } from './../users-data/users-data.service';
import { Product } from './../../models/Product';
import { CustomPizza } from './../../models/CustomPizza';
import { Pizza } from './../../models/Pizza';
import { Component, OnInit, DoCheck } from '@angular/core';
import { Order } from '../../models/Order';

@Component({
    selector: 'app-shopping-cart',
    templateUrl: './shopping-cart.component.html',
    styleUrls: ['./shopping-cart.component.css']
})

export class ShoppingCartComponent implements OnInit, DoCheck {
    public cart: Cart = new Cart();
    public address: string;

    constructor(
        private readonly userDataService: UsersDataService,
        private readonly notificator: NotificatorService,
        private readonly cookieService: CookieService,
        private readonly alerter: AlerterService,
        private readonly router: Router
    ) { }

    ngOnInit() {
        this.userDataService.getCurrentUserInfo().subscribe(
            (response) => {
                this.cart = response['data'][0].cart;
                this.address = response['data'][0].address;
            },
            (err) => this.notificator.showError(err.error.message));
    }

    ngDoCheck() {
        this.cart.price = +this.cookieService.getCookie('cartPrice');
    }

    removeCustomPizzaOrder(pizza: CustomPizza) {
        const deletingPizza = this.cart.customPizza
            .find(x => {
                return Object.keys(pizza).every(key => {
                    if (pizza[key].length) {
                        return pizza[key].every(type => {
                            return !!x[key].find(y => y.toString() === type.toString());
                        });
                    }

                    return pizza[key] === x[key];
                });
            });

        this.cart.customPizza = this.cart.customPizza.filter(x => x !== deletingPizza);
        this.successRemovePizza(pizza);

        this.userDataService.deleteCustomPizzaFromCart(pizza).subscribe(
            (response) => this.notificator.showSuccess(response['message']),
            (err) => this.notificator.showError(err.error.message));
    }

    removeClassicPizzaOrder(pizza: Pizza) {
        const deletingPizza = this.cart.pizza
            .find(x => {
                return Object.keys(pizza).every(key => {
                    return pizza[key] === x[key];
                });
            });

        this.cart.pizza = this.cart.pizza.filter(x => x !== deletingPizza);
        this.successRemovePizza(pizza);

        this.userDataService.deleteClassicPizzaFromCart(pizza).subscribe(
            (response) => this.notificator.showSuccess(response['message']),
            (err) => this.notificator.showError(err.error.message));
    }

    orderPizza() {
        this.alerter.showPurchaseSuggestion()
            .then(() => {
                const order = new Order();
                order.date = new Date();
                order.items = this.cart;

                return this.alerter.askForAddressSuggestion()
                    .then(() => {
                        order.address = this.address;

                        this.userDataService.addOrderToUser(order).subscribe(
                            (response) => this.successOrderPizza(),
                            (err) => this.notificator.showError(err.error.message));
                    })
                    .catch(() => {
                        return this.alerter.getAddressSuggestion()
                            .then((address: string) => {
                                order.address = address;

                                this.userDataService.addOrderToUser(order).subscribe(
                                    (response) => this.successOrderPizza(),
                                    (err) => this.notificator.showError(err.error.message));
                            });
                    });
            })
            .catch((error: string) => {
                this.alerter.showErrorAlert('Cancelled', error);
            });
    }

    private successOrderPizza() {
        this.alerter.showSuccessAlert('Ordered!', 'The order is comming in 30 minutes!');
        this.cart = new Cart();

        this.cookieService.setCookie('cartItems', '0');
        this.cookieService.setCookie('cartPrice', '0');

        this.router.navigateByUrl('/users/orders');
    }

    private successRemovePizza(pizza) {
        const cartItems = +this.cookieService.getCookie('cartItems') - 1;
        const cartPrice = +this.cookieService.getCookie('cartPrice') - pizza.price;

        this.cookieService.setCookie('cartItems', cartItems.toString());
        this.cookieService.setCookie('cartPrice', cartPrice.toString());
    }
}
