<?php

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

class CncnetController extends CnCNet_Controller_Action
{
    public function _init ( )
    {
        require_once( 'Zend/Json/Server.php' );
        
        //date_default_timezone_set ( "Europe/London" );
        
        $this->_server = new Zend_Json_Server( );
        $this->_helper->viewRenderer->setNoRender( );
    }

    public function indexAction ( )
    {
        $this->_server->setClass( 'CnCNet_Rest' );
        
        if ('GET' == $_SERVER['REQUEST_METHOD']) {
            // Indicate the URL endpoint, and the JSON-RPC version used:
            $this->_server->setTarget('/cncnet-frontend/cncnet')
                ->setEnvelope(Zend_Json_Server_Smd::ENV_JSONRPC_2);

            // Grab the SMD
            $smd = $this->_server->getServiceMap();

            // Return the SMD to the client
            header('Content-Type: application/json');
            echo $smd;
            return;
        }
        
        $this->_server->handle( );
    }
}