/*
 * Copyright (c) 2011 John Sanderson <js@9point6.com>
 *
 * Permission to use, copy, modify, and distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
 
( function( $ )
{
    $.fn.extend(
    {
        cncNet: function( options ) 
        {
 
            //Settings list and the default values
            var defaults = 
            {
                serverUrl: 'cncnet',
                heartbeat: 250
            };
            
            var options = $.extend ( defaults, options );
            
            return this.each( function ( ) 
            {
                var o = options;
                var obj = $( this );
                var cncnet = jQuery.Zend.jsonrpc( { url: o.serverUrl, async: true } );
                var s_key = false;
                var hb_since = 0;
                var current_room = 0;
                var last_event = 0;
                var username = "Player";
                
                if ( $.browser.webkit ) 
                    $( 'html' ).addClass ( "wk" );
                
                // <login>
                var reg_mode = false;
                
                obj.append( '<div id="cncnet_login"><div class="container_12">' +
                    '<h1 class="grid_6 prefix_3 suffix_3">Login to CnCNet</h1>' +
                    '<div id="cncnet_login_fields">' +
                    '<div class="grid_6 prefix_3 suffix_3"><div id="cncnet_login_error"></div></div>' +
                    '<label class="grid_6 prefix_3 suffix_3"><span>Username:</span>' +
                    '<input id="cncnet_login_un" type="text" tabstop="1" /></label>' +
                    '<label class="grid_6 prefix_3 suffix_3"><span>Password:</span>' +
                    '<input id="cncnet_login_pw" type="password" tabstop="2" /></label>' +
                    '<label class="grid_6 prefix_3 suffix_3 hide"><span>Email:</span>' +
                    '<input id="cncnet_login_em" type="email" tabstop="2" /></label></div>' +
                    '<div class="posbottom"><div class="login_button grid_2 prefix_4">' +
                    '<button id="cncnet_login_do" tabstop="3" type="button">Login</button></div>' +
                    '<div class="login_button grid_2 suffix_4">' + 
                    '<button id="cncnet_login_reg" tabstop="4" type="button">Register</button></div>' +
                    '</div></div></div>'
                );
                
                $( '#cncnet_login_un' ).focus ( );
                
                var login_complete = function ( )
                {
                    if ( s_key != false )
                    {
                        $('#cncnet_login').animate ( 
                        {
                            'opacity': '0'
                        }, function ( )
                        {
                            $( this ).hide( );
                        } );
                        $( '#cncnet_main' ).fadeIn ( );
                        
                        $( '#cncnet_chat_box' ).focus ( );
                        
                        rooms = cncnet.lst (
                        {
                            success: function ( ret, id, method ) 
                            {
                                $( ret ).each ( function ( i, val )
                                {
                                    add_room_to_list ( val );
                                } );
                                
                                display_player_list ( 0 );
                            },
                            error: function ( )
                            {
                                //
                            }
                        } );
                        
                        $.doTimeout( 'heartbeat', o.heartbeat, function ( )
                        {
                            do_heartbeat ( );
                        } );
                    }
                };
                
                var invalid_session_count = 0;
                var do_heartbeat = function ( )
                {
                    cncnet.heartbeat ( s_key, hb_since, last_event,
                    {
                        success: function ( ret, id, method ) 
                        {
                            if ( ret.success )
                            {
                                invalid_session_count = 0;
                                hb_since = ret.info.time;
                        
                                $.each ( ret.events, function ( i, val )
                                {
                                    val_id = parseInt( val.id );
                                    if ( val_id <= last_event | val.type == 'noevent' )
                                        return false;
                                        
                                    last_event = val_id;
                                    
                                    switch ( val.type )
                                    {
                                        case 'msg':
                                            process_message ( val );                   
                                            break;
                                        case 'ready':
                                            break;
                                        case 'launch':
                                            break;
                                        case 'join':
                                            process_join ( val );
                                            break;
                                        case 'exit':
                                            process_exit ( val );
                                            break;
                                        case 'room':
                                            add_room_to_list ( val.param );
                                            break;
                                    }
                                } );
                            }
                            else
                            {
                                if ( typeof ret.errors != 'undefined' )
                                    if ( ret.errors[0] == "Invalid Session" )
                                    {
                                        if ( invalid_session_count == 3 )
                                        {
                                            $.cookie ( 's_key', null );
                                            $.cookie ( 'username', null );
                                            var url = window.location.href;
                                            if ( url.indexOf("?") != -1 )
                                                url = url.split("?")[0];

                                            window.location = url + "?error=session";
                                        }
                                        else
                                            invalid_session_count++;
                                    }
                                else
                                { 
                                    // Server error
                                }
                            }
                            
                            $.doTimeout( 'heartbeat', o.heartbeat, function ( )
                            {
                                do_heartbeat ( );
                            } );
                        },
                        error: function ( )
                        {
                            //
                            
                            $.doTimeout( 'heartbeat', o.heartbeat, function ( )
                            {
                                do_heartbeat ( );
                            } );
                        }
                    } );
                };
                
                var login_error_visible = false;
                var login_error = function ( text )
                {
                    var err = $( '#cncnet_login_error' );
                    if ( !login_error_visible )
                    {
                        login_error_visible = true;
                        var h = '1.5em'; // TODO: make this not hardcoded
                        err.css ( 
                        {
                            'display': 'block',
                            'height': '0',
                            'opacity': '0'
                        } ).animate (
                        {
                            'height': h,
                            'opacity': '1'
                        } );
                        $('#cncnet_login').animate ( 
                        {
                            'height': '+=4em',
                            'margin-top': '-=2em'
                        } );
                    }
                    
                    err.text ( text );
                };
                
                if ( window.location.search )
                {
                    switch ( window.location.search )
                    {
                        case "?error=session":
                            login_error ( "Session Expired. Please log in again" );
                            break;
                        case "?logout=1":
                            login_error ( "Logout successful!" );
                            break;
                    }
                }
                
                var login_loading_spinner = function ( show )
                {
                    if ( show )
                    {
                        $( '#cncnet_login_fields' ).animate (
                        {
                            'opacity': '0'
                        } );
                        $( '#cncnet_login > div' ).css ( 
                        {
                            'background-image': 'url("img/big_blk_spinner.gif")',
                            'background-repeat': 'no-repeat',
                            'background-position': '50% 50%'
                        } );
                    }
                    else
                    {
                        $( '#cncnet_login_fields' ).animate (
                        {
                            'opacity': '1'
                        } );
                        $( '#cncnet_login > div' ).css ( 
                        {
                            'background-image': 'none',
                        } );
                    }
                }
                
                var do_login = function ( )
                {
                    var un = $( '#cncnet_login_un' ).val ( );
                    var pw = $( '#cncnet_login_pw' ).val ( );
                    var em = $( '#cncnet_login_em' ).val ( );
                    
                    if ( un == "" )
                        return login_error ( "Please enter a username" );
                        
                    if ( pw == "" )
                        return login_error ( "Please enter a password" );
                        
                    if ( reg_mode && em == "" )
                        return login_error ( "Please enter an email address" );
                        
                    var un_regex = /^([A-Za-z0-9]{3,12})$/;
                    if ( reg_mode && !un_regex.test ( un ) )
                        return login_error ( "Please pick username between 3 and 12 characters long with only letters and numbers" );
                        
                    var pw_regex = /^(.{6,64})$/;
                    if ( reg_mode && !un_regex.test ( pw ) )
                        return login_error ( "Please enter a password at least 6 characters long" );
                        
                    var em_regex = /^([A-Za-z0-9_\+\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
                    if ( reg_mode && !em_regex.test ( em ) )
                        return login_error ( "Please enter a valid email address" );
                    
                    login_loading_spinner ( true );
                    if ( reg_mode )
                    {
                        cncnet.register ( un, pw, em,
                        {
                            success: function ( ret, id, method ) 
                            {
                                if ( ret.success )
                                {
                                    s_key = ret.s_key;
                                    username = un;
                                    $.cookie ( 's_key', s_key, { expires: 7 } );
                                    $.cookie ( 'username', un, { expires: 7 } );
                                    login_complete ( );
                                }
                                else
                                {
                                    login_loading_spinner ( false );
                                    if ( typeof ret.errors != 'undefined' )
                                        login_error ( ret.errors[0] );
                                    else
                                        login_error ( "Server Error: Please try again in a moment" );
                                }
                            },
                            error: function ( )
                            {
                                login_loading_spinner ( false );
                                login_error ( "Server Error: Please try again in a moment" );
                            }
                        } );
                    }
                    else
                    {
                        cncnet.login ( un, pw,
                        {
                            success: function ( ret, id, method ) 
                            {
                                if ( ret.success )
                                {
                                    s_key = ret.s_key;
                                    username = un;
                                    $.cookie ( 's_key', s_key, { expires: 7 } );
                                    $.cookie ( 'username', un, { expires: 7 } );
                                    login_complete ( );
                                }
                                else
                                {
                                    login_loading_spinner ( false );
                                    if ( typeof ret.errors != 'undefined' )
                                        login_error ( ret.errors[0] );
                                    else
                                        login_error ( "Server Error: Please try again in a moment" );
                                }
                            },
                            error: function ( )
                            {
                                login_loading_spinner ( false );
                                login_error ( "Server Error: Please try again in a moment" );
                            }
                        } );
                    }
                };
                
                $( '#cncnet_login_do' ).click ( function ( ) { do_login ( ); } );
                $( '#cncnet_login_un, #cncnet_login_pw, #cncnet_login_em' ).keypress ( function ( e ) { if ( e.keyCode == 13 ) do_login ( ); } );
                
                $( '#cncnet_login_reg' ).click ( function ( )
                {
                    var button_height = $( this ).height( ) + 2;
                    if ( !reg_mode )
                    {
                        reg_mode = true;
                        $( '#cncnet_login_reg' ).animate ( 
                        {
                            'height': '0'
                        }, function ( ) {
                            $( this ).html( "Cancel" ).animate ( 
                            {
                                'height': button_height
                            } );
                        } );
                        $( '#cncnet_login_do' ).animate ( 
                        {
                            'height': '0'
                        }, function ( ) 
                        {
                            $( this ).html( "Register" ).animate ( 
                            {
                                'height': button_height
                            } );
                        } );
                        $('#cncnet_login').animate ( 
                        {
                            'height': '+=4em',
                            'margin-top': '-=2em'
                        } );
                        
                        $('#cncnet_login_fields .hide').css ( 
                        {
                            'opacity': '0',
                            'display': 'block'
                        } ).animate( 
                        {
                            'opacity': '1'
                        } );
                        
                        $('#cncnet_login_em').focus ( );
                    }
                    else
                    {
                        reg_mode = false;
                        $( '#cncnet_login_reg' ).animate ( 
                        {
                            'height': '0'
                        }, function ( ) 
                        {
                            $( this ).html( "Register" ).animate ( 
                            {
                                'height': button_height
                            } );
                        } );
                        $( '#cncnet_login_do' ).animate ( 
                        {
                            'height': '0'
                        }, function ( ) {
                            $( this ).html( "Login" ).animate ( 
                            {
                                'height': button_height
                            } );
                        } );
                        $('#cncnet_login').animate ( 
                        {
                            'height': '-=4em',
                            'margin-top': '+=2em'
                        } );
                        
                        $('#cncnet_login_fields .hide').animate ( 
                        {
                            'opacity': '0',
                            'display': 'block'
                        }, function ( )
                        {
                            $( this ).hide( );
                        } );
                    }
                        
                } );
                // </login>
                
                // <main UI>
                obj.append ( 
                    '<div id="cncnet_main" class="container_12">' + 
                    '<header><h1 class="grid_8">CnCNet</h1><nav class="grid_4"><ul>' +
                    '<li><a id="cncnet_logout">Logout</a></li>' +
                    '<li><a id="cncnet_changepw">Settings</a></li>' +
                    '</ul></nav></header>' +
                    '<div class="grid_8"><div id="cncnet_chat"><ol id="cncnet_chat_list"></ol>' +
                    '<div class="cncnet_shutter">' +
                    '<input id="cncnet_chat_box" type="text" placeholder="Type here to chat..." />' +
                    '<button id="cncnet_chat_send" class="cncnet_button" type="button">Send</button>' +
                    '</div></div></div>' +
                    '<div class="grid_4"><div id="cncnet_users"><ul id="cncnet_user_list"></ul>' +
                    '</div><div id="cncnet_rooms"><ul id="cncnet_room_list"></ul>' +
                    '<div class="cncnet_shutter"><button id="cncnet_room_create" class="cncnet_button" ' +
                    'type="button">New</button></div></div></div></div>'
                );
                $( '#cncnet_main' ).hide( ).height( $( window ).height ( ) );
                
                $( window ).resize ( function ( ) 
                {
                    $( '#cncnet_main' ).height ( $( window ).height ( ) );
                } );
                
                $( '#cncnet_room_create' ).click ( function ( ) 
                {
                    var par = $( this ).parent( );
                    par_height = $( par ).height ( );
                    
                    $( '.cncnet_button', par ).fadeOut ( );
                    par.animate (
                    {
                        'height': '+=13em'
                    }, function ( )
                    {
                        // TODO: Dynamic game list
                        par.append ( 
                            '<div id="cncnet_new_room"><h2>New Room</h2>' +
                            '<label><input type="text" id="cncnet_game_name" value="' +
                            username + '\'s Game" /></label><label><select id="cncnet_game_type">' +
                            '<option value="no" id="cncnet_game_type_default" selected="selected">' +
                            'Please select a game</option><option value="cnc95">C&C95</option>' +
                            '<option value="ra">Red Alert</option>' +
                            '</select></label><label><input type="checkbox" ' +
                            'id="cncnet_game_late" /><span>Allow Late Joins</span></label>' +
                            '<label><input type="checkbox" id="cncnet_game_private" />' +
                            '<span>Private Game</span></label><label><input type="password" ' +
                            'placeholder="Password" id="cncnet_game_password" /></label>' +
                            '<button id="cncnet_game_do" type="button" class="cncnet_button">' +
                            'Create Room</button><button id="cncnet_game_dont" type="button" ' +
                            'class="cncnet_button">Cancel</button></div>'
                        );
                        return_height = $( par ).height ( );
                        $( '#cncnet_new_room' ).hide ( ).fadeIn ( );
                        $( '#cncnet_game_password' ).hide ( );
                        $( '#cncnet_game_private' ).click ( function ( )
                        {
                            if ( $( this ).prop ( 'checked' ) )
                            {
                                par.animate ( 
                                {
                                    'height': '+=3.5em'
                                } );
                                $( '#cncnet_game_password' ).css (
                                {
                                    'display': 'block',
                                    'height': '0',
                                    'opacity': '0'
                                } ).animate (
                                {
                                    'height': $( '#cncnet_game_name' ).height ( ),
                                    'opacity': '1'
                                } );
                            }
                            else
                            {
                                par.animate ( 
                                {
                                    'height': return_height
                                } );
                                $( '#cncnet_game_password' ).animate (
                                {
                                    'height': '0',
                                    'opacity': '0'
                                }, function ( ) 
                                {
                                    $( this ).hide ( );
                                } );
                            }
                        } );
                        
                        $( '#cncnet_game_do' ).click ( function ( )
                        {
                            var gn = $( '#cncnet_game_name' ).val ( );
                            var gt = $( '#cncnet_game_type' ).val ( );
                            var lj = $( '#cncnet_game_late' ).prop ( "checked" );
                            var pr = $( '#cncnet_game_private' ).prop ( "checked" );
                            var pw = $( '#cncnet_game_password' ).val ( );
                            
                            var valid = true;
                            
                            if ( gn == "" )
                            {
                                $( '#cncnet_game_name' ).prop ( "placeholder", "We need a name!").css ( 
                                {
                                    'opacity': '0.25'
                                } ).animate ( 
                                {
                                    'opacity': '1'
                                }, 1000 );
                                valid = false;
                            }   // Error: Need game name
                            
                            if ( gt == "no" )
                            {
                                $( '#cncnet_game_type' ).css ( 
                                {
                                    'opacity': '0.25'
                                } ).animate ( 
                                {
                                    'opacity': '1'
                                }, 1000 );
                                valid = false;
                            }   // Error: Need game name
                            
                            if ( pr && pw == "" )
                            {
                                $( '#cncnet_game_password' ).prop ( "placeholder", "We need a password!").css ( 
                                {
                                    'opacity': '0.25'
                                } ).animate ( 
                                {
                                    'opacity': '1'
                                }, 1000 );
                                valid = false;
                            }    // Error: Need pw
                                
                            // TODO: Add more validation here
                            // TODO: Add a better error notification (IE can't see placeholders)
                            
                            cncnet.create ( s_key, gn, gt, lj, -1, pw, 
                            {
                                success: function ( ret, id, method )
                                {
                                    //
                                },
                                error: function ( )
                                {
                                    //
                                }
                            } );
                        } );
                        
                        $( '#cncnet_game_dont' ).click ( function ( )
                        {
                            $( '#cncnet_new_room' ).fadeOut ( function ( )
                            {
                                par.animate ( {
                                    'height': par_height
                                }, function ( )
                                {
                                    $( '#cncnet_new_room' ).remove ( );
                                    $( '.cncnet_button', par ).fadeIn ( );
                                } );
                            } );
                        } );
                    } );
                } );
                
                $( '#cncnet_logout' ).click ( function ( ) 
                {
                    cncnet.logout ( s_key,
                    {
                        success: function ( ret, id, method ) 
                        {
                            if ( ret.success )
                            {
                                $.cookie ( 's_key', null );
                                $.cookie ( 'username', null );
                                var url = window.location.href;
                                if ( url.indexOf("?") != -1 )
                                    url = url.split("?")[0];

                                window.location = url + "?logout=1";
                            }
                            else
                            {
                                // TODO: error handle
                            }
                        },
                        error: function ( )
                        {
                            // TODO: error handle
                        }
                    } );
                } );
                
                var send_message = function ( )
                {
                    var msg = $( '#cncnet_chat_box' ).val ( );
                    
                    if ( msg == "" )
                        return;
                    //var old_bg = $( '#cncnet_chat_box' ).css ( 'background-image' );
                    //$( '#cncnet_chat_box' ).css ( 'background-image', 'url("img/spinner.gif") no-repeat 99%, ' + old_bg );
                
                    cncnet.send ( s_key, msg, current_room,
                    {
                        success: function ( ret, id, method ) 
                        {
                            if ( ret.success )
                            {
                                //$( '#cncnet_chat_box' ).css ( 'background-image', old_bg );
                            }
                            else
                            {
                                // TODO: error handle
                            }
                        },
                        error: function ( )
                        {
                            // TODO: error handle
                        }
                    } );
                    
                    $( '#cncnet_chat_box' ).val ( "" );
                };
                
                $( '#cncnet_chat_send' ).click ( function ( ) { send_message ( ); } );
                
                $( '#cncnet_chat_box' ).keypress ( function ( e ) { if ( e.keyCode == 13 ) send_message ( ); } );
                
                room_list = new Array ( );
                
                var add_room_to_list = function ( room )
                {
                    room.buffer = new Array ( );
                    room_list.push ( room );
                    $( '#cncnet_room_list' ).append ( 
                        '<li ' + ( room.pass ? 'class="locked_room"' : '' ) + 
                        '><span class="room_game">[' + room.game + 
                        ']</span> <span class="room_name">' + room.name +
                        '</span>' + ( room.players != '-1' ? '<span class="room_players">[1/' + 
                        room.players + ']</span>' : '' ) + '</li>' );
                };
                
                var display_player_list = function ( room_id )
                {
                    $( room_list ).each ( function ( id, val )
                    {
                        if ( val.id == room_id )
                        {
                            for ( var a in val.users )
                            {
                                $( '#cncnet_user_list' ).append ( 
                                    '<li id="user-' + a + '"><span class="user_name">' +
                                    val.users[a] + '</span></li>' 
                                );  
                            } 
                            return false;
                        }
                        return true;
                    } );
                };
                
                var process_message = function ( message_obj )
                {
                    var is_sys = message_obj.user == 0
                    if ( !is_sys )
                    {
                        var room = {};
                        $( room_list ).each ( function ( id, val )
                        {
                            if ( val.id == message_obj.room )
                            {
                                room = val;
                                return false;
                            }
                            return true;
                        } );
                    }
                    
                    url_reg = /(http|https|ftp|ftps)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(\/\S*)?/gi;

                    if( url_reg.test ( message_obj.param ) )
                        message_obj.param = message_obj.param.replace ( url_reg, '<a href="$&" rel="nofollow">$&</a>' );
                    
                    if ( current_room == message_obj.room )
                    {
                        $( '#cncnet_chat_list' ).append ( 
                            '<li' + ( is_sys ? ' class="system_message"' : '' ) + 
                            '><span class="chat_time">[' + message_obj.time.split(" ")[1] + 
                            ']</span> ' + ( is_sys ? '*' : ( '<span class="chat_username">' + 
                            room.users[message_obj.user] + '</span>:' ) ) + 
                            ' <span class="chat_message">' + message_obj.param + '</span></li>'
                        ).animate(
                        { 
                            'scrollTop': $( '#cncnet_chat_list' ).prop( 'scrollHeight' ) 
                        }, 500);
                    }
                };
                
                var process_join = function ( join_obj )
                {
                    var rid = 0
                    var room = {};
                    $( room_list ).each ( function ( id, val )
                    {
                        if ( val.id == join_obj.room )
                        {
                            room = val;
                            rid = id;
                            return false;
                        }
                        return true;
                    } );
                    
                    room.users[join_obj.user] = join_obj.param;
                    room_list[rid] = room;
                    
                    
                    if ( current_room == join_obj.room )
                    {
                        $( '#cncnet_user_list' ).append ( 
                            '<li id="user-' + join_obj.user + '"><span class="user_name">' +
                            join_obj.param + '</span></li>' 
                        );  
                    
                        $( '#cncnet_chat_list' ).append ( 
                            '<li class="system_message"><span class="chat_time">[' + join_obj.time.split(" ")[1] + 
                            ']</span> * <span class="chat_username">' + join_obj.param +
                            '</span> has just joined this room</li>'
                        ).animate(
                        { 
                            scrollTop: $( '#cncnet_chat_list' ).prop ( 'scrollHeight' ) 
                        }, 500);
                    }
                };
                
                var process_exit = function ( exit_obj )
                {
                    var rid = 0
                    var room = {};
                    $( room_list ).each ( function ( id, val )
                    {
                        if ( val.id == exit_obj.room )
                        {
                            room = val;
                            rid = id;
                            return false;
                        }
                        return true;
                    } );
                    
                    room.users.spice( exit_obj.user, 1 );
                    room_list[rid] = room;
                    
                    
                    if ( current_room == exit_obj.room )
                    {
                        $( '#cncnet_chat_list' ).append ( 
                            '<li class="system_message"><span class="chat_time">[' + exit_obj.time.split(" ")[1] + 
                            ']</span> * <span class="chat_username">' + exit_obj.param +
                            '</span> has just joined this room</li>'
                        ).animate(
                        { 
                            scrollTop: $( '#cncnet_chat_list' ).prop ( 'scrollHeight' ) 
                        }, 500);
                        $( '#user-' + exit_obj.user ).remove( );
                    }
                };
                // </main UI>
                
                s_key = $.cookie( 's_key' );
                s_key = s_key == null ? false : s_key;
                username = $.cookie( 'username' );
                username = s_key == null ? "Player" : username;
                login_complete ( );
            } );
        }
    } );
} ) ( jQuery );