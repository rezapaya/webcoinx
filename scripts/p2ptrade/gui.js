/*jslint */
/*global define, window, Bitcoin, BigInteger */
define(
    ["jquery", "p2ptrade/comm", "p2ptrade/agent", "p2ptrade/offer", "p2ptrade/wallet", "p2ptrade/mockwallet"],
    function ($, HTTPExchangeComm, ExchangePeerAgent, ExchangeOffer, EWallet, MockWallet) {
        "use strict";
        function P2pgui(wm, cm, exit, cfg) {
            var self = this, ewallet;
            if (cfg.get('p2ptradeMockWallet', false) === true) {
                ewallet = new MockWallet();
            } else {
                ewallet = new EWallet(wm, cm, exit);
            }
            this.ewallet = ewallet;
            this.cm = cm;

            this.comm = new HTTPExchangeComm('http://p2ptrade.btx.udoidio.info/messages');
            this.epa = new ExchangePeerAgent(ewallet, this.comm);

            window.setInterval(function () {
                self.comm.update();
                self.updateGUIstate();
            }, 1000);

            $('#buy-button').click(function (event) {
                event.preventDefault();
                self.create_offer(false, "1", $('#buyprice').val(),
                                  self.colorid, self.unit, $('#buyamt').val()
                                 );
            });

            $('#sell-button').click(function (event) {
                event.preventDefault();
                self.create_offer(self.colorid, self.unit, $('#sellamt').val(),
                                  false, "1", $('#sellprice').val(), "1"
                                  );
            });
        }

                // send refers to what we're sending to counterparty, recv what we want in return
        // TBA: should API user (which gui is) ever worry about units?        
        P2pgui.prototype.create_offer = function (sendcolor, sendunit, sendamt, recvcolor, recvunit, recvamt) {
            console.log("create_offer: send " + sendcolor + "," + sendunit + "," + sendamt);
            console.log("create_offer: recv " + recvcolor + "," + recvunit + "," + recvamt);
            function conv(a, b, c) {
                if (c === false) {
                    return Bitcoin.Util.parseValue(a, false).toString();
                }
                return (new BigInteger(a)).multiply(new BigInteger(b)).toString();
            }
            this.epa.registerMyOffer(new ExchangeOffer(null, {
                colorid: sendcolor,
                value: conv(sendamt, sendunit, sendcolor)
            }, {
                colorid: recvcolor,
                value: conv(recvamt, recvunit, recvcolor)
            }, true));
        };


        P2pgui.prototype.updateGUIstate = function () {
            var self = this,
                active = this.epa.hasActiveEP(),
                text = "",
                bids = $('#p2p_bids'),
                asks = $('#p2p_asks'),
                offers = this.epa.their_offers,
                my_offers = this.epa.my_offers;

            if (active) {
                text = "Transaction in progress: " + this.epa.active_ep.state;
            }

            $("#p2p_status").text(text);


            function display(bids, asks, offers, button) {
                var oid,
                    displayOfferLine = function (offer) {
                        var target,
                            res,
                            a,
                            b,
                            op;
                        if (offer.A.colorid === self.colorid && offer.B.colorid === false) {
                            target = asks;
                            op = "buy";
                        } else if (offer.B.colorid === self.colorid && offer.A.colorid === false) {
                            target = bids;
                            op = "sell";
                        } else {
                            return;
                        }

                        res = '<tr><td>' + self.cm.formatValueU(offer.A.value, offer.A.colorid) +
                            "<td>" + self.cm.formatValueU(offer.B.value, offer.B.colorid);
                        // bleh
                        if (button) {
                            res = res + '<td><button id="buy-button" class="btn btn-primary btn-block" onclick="';
                            a = self.cm.formatValue(offer.A.value, offer.A.colorid);
                            b = self.cm.formatValue(offer.B.value, offer.B.colorid);
                            res = res + "$('#" + op + "amt').val('" + a + "'); $('#" + op +  "price').val('" + b + "');";
                            res = res + '">' + op + '</button>';
                        }
                        target.append(res);
                    };
                bids.empty();
                asks.empty();
                for (oid in offers) {
                    if (offers.hasOwnProperty(oid)) {
                        displayOfferLine(offers[oid]);
                    }
                }
            }
            display($('#p2p_bids'), $('#p2p_asks'), offers, true);
            display($('#my_p2p_bids'), $('#my_p2p_asks'), my_offers);
        };

        P2pgui.prototype.setCurrentColor = function (colorid, unit) {
            console.log("setCurrentColor: " + colorid + "," + unit);
            this.colorid = colorid;
            this.unit = unit.toString();
        };

        return P2pgui;
    }
);

