/* -*- Mode: JS2; indent-tabs-mode: nil; js2-basic-offset: 4 -*- */
/* vim: set et ts=4 sw=4: */
/*
 * Copyright (c) 2014 Mattias Bengtsson
 *
 * GNOME Maps is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * GNOME Maps is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with GNOME Maps; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Author: Mattias Bengtsson <mattias.jc.bengtsson@gmail.com>
 */

const Gtk = imports.gi.Gtk;

const Mainloop = imports.mainloop;
const Lang = imports.lang;
const Utils = imports.utils;

const Notification = new Lang.Class({
    Name: 'Notification',
    Extends: Gtk.Revealer,
    Abstract: true,

    _init: function(params) {
        this.parent({ visible: true,
                      halign: Gtk.Align.CENTER,
                      valign: Gtk.Align.START });

        this._ui = Utils.getUIObject('notification', [ 'frame',
                                                       'body',
                                                       'dismiss-button']);

        this._ui.dismissButton.connect('clicked', this.dismiss.bind(this));
        this.add(this._ui.frame);
    },

    reveal: function() {
        this._setRevealAndEmit(true, 'revealed');
    },

    dismiss: function() {
        this._setRevealAndEmit(false, 'dismissed');
    },

    _setRevealAndEmit: function(state, signal) {
        // We only want to send a dismissed / shown -signal
        // if there is an actual change in revealed state.
        if(state !== this.child_revealed) {
            this.set_reveal_child(state);
            Mainloop.timeout_add(this.transition_duration, (function() {
                this.emit(signal);
                return false;
            }).bind(this));
        }
    }
});
Utils.addSignalMethods(Notification.prototype);

const Message = new Lang.Class({
    Name: 'Message',
    Extends: Notification,

    _init: function(msg) {
        this.parent();
        let label = new Gtk.Label({ visible : true,
                                    hexpand : true,
                                    halign  : Gtk.Align.START,
                                    label   : msg });
        this._ui.body.add(label);
    }
});

const Action = new Lang.Class({
    Name: 'Action',
    Extends: Notification,
    Abstract: true,

    _init: function(msg, buttonLabel, callback) {
        this.parent();
        let label = new Gtk.Label({ visible : true,
                                    hexpand : true,
                                    halign  : Gtk.Align.START,
                                    label   : msg });
        let button = new Gtk.Button({ visible : true,
                                      label   : buttonLabel });
        button.connect('clicked', callback);

        this._ui.body.add(label);
        this._ui.body.add(button);
    }
});

const NoNetwork = new Lang.Class({
    Name: 'NoNetwork',
    Extends: Action,

    _init: function() {
        this.parent("Maps need a working network connection to function properly",
                    "Turn On",
                    (function() {
                        log("TODO: connect to network here...");
                    }));
    }
});

const NoLocation = new Lang.Class({
    Name: 'NoLocation',
    Extends: Action,

    _init: function() {
        this.parent("Turn on location services to find your location",
                    "Turn On",
                    (function() {
                        log("TODO: turn on location services here...");
                    }));
    }
});

const Type = {
    NO_NETWORK  : "NO_NETWORK",
    NO_LOCATION : "NO_LOCATION"
};

const Manager = new Lang.Class({
    Name: 'Manager',

    _init: function(overlay) {
        this._overlay = overlay;
        this._notifications = {};
        for(let type in Type) {
            this._notifications[type] = undefined;
        }
    },

    showMessage: function (msg) {
        let notification = new Message(msg);
        notification.connect('dismissed',
                             notification.destroy.bind(notification));
        this._overlay.add_overlay(notification);
        notification.reveal();
    },

    showNotification: function(type) {
        if(!Type.hasOwnProperty(type)) {
            Utils.log("Error: tried to show notification of type "
                      + type +
                      " but it isn't implemented.");
            return;
        }
        let notification = this._getNotification(type);
        if(!notification.get_parent())
            this._overlay.add_overlay(notification);
        notification.reveal();
    },

    _getNotification: function(type) {
        if(!this._notifications[type]) {
            this._notifications[type] = this._createNotification(type);
        }
        return this._notifications[type];
    },

    _createNotification: function (type) {
        let notification;
        switch(type) {
        case Type.NO_NETWORK:
            notification = new NoNetwork();
            break;
        case Type.NO_LOCATION:
            notification = new NoLocation();
            break;

        default: return undefined;
        }

        notification.connect('dismissed', (function() {
            this._overlay.remove(notification);
        }).bind(this));

        return notification;
    }
});
