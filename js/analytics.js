( function ( $ ) {
	function setCookie( cName, cValue, expDays ) {
		const date = new Date();
		date.setTime( date.getTime() + expDays * 24 * 60 * 60 * 1000 );
		const expires = 'expires=' + date.toUTCString();
		document.cookie = cName + '=' + cValue + '; ' + expires + '; path=/';
	}

	function getCookie( cName ) {
		const name = cName + '=';
		const cDecoded = decodeURIComponent( document.cookie ); //to be careful
		const cArr = cDecoded.split( '; ' );
		let res = [];
		cArr.forEach( ( val ) => {
			if ( val.indexOf( name ) === 0 ) {
				res = val.substring( name.length );
			}
		} );
		return res;
	}

	async function load_frontend_analytics() {
		if ( cartflows && '' !== cartflows.current_step ) {
			const flow_id = cartflows.current_flow,
				step_id = cartflows.current_step,
				flow_cookie = cartflows.flow_cookie + flow_id,
				step_cookie = cartflows.step_cookie + flow_id;

			let flow_cookieData = getCookie( flow_cookie );

			if ( flow_cookieData.length > 0 ) {
				flow_cookieData = JSON.parse(
					decodeURIComponent( flow_cookieData )
				);
			}

			const is_returning = flow_cookieData.includes( step_id );

			if ( ! is_returning ) {
				flow_cookieData.push( step_id );
			}

			setCookie(
				flow_cookie,
				encodeURIComponent( JSON.stringify( flow_cookieData ) ),
				cartflows.analytics_cookie_expire_time
			);

			let base_url = cartflows?.analytics_base_url;

			// Added a fallback if the URL is not formed or empty or does not have the complete website URL.
			if (
				'' === base_url ||
				'null' === base_url ||
				'/wp-json/cartflows-pro/v1/flow-analytics/' === base_url
			) {
				const basePath =
						window.location.pathname.split( '/' )[ 1 ] || '',
					full_url =
						window.location.origin + '/' + basePath + '/wp-json';

				base_url = `${ full_url }cartflows-pro/v1/flow-analytics/`;
			}

			const url = base_url,
				urlParams = new URLSearchParams( window.location.search ),
				paramsArray = [];

			if ( urlParams.size > 0 ) {
				urlParams.forEach( function ( value, key ) {
					paramsArray.push( { name: key, value } );
				} );
			}

			let step_cookieData = getCookie( step_cookie );

			const data = {
				step_id: cartflows.current_step,
				flow_id: cartflows.current_flow,
				is_returning,
				flow_cookie_data: JSON.stringify( flow_cookieData ),
				step_cookie_data: step_cookieData,
				url_params: JSON.stringify( paramsArray ),
			};
			try {
				fetch( url, {
					method: 'POST', // *GET, POST, PUT, DELETE, etc.
					mode: 'cors', // no-cors, *cors, same-origin
					cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
					credentials: 'omit', // include, *same-origin, omit
					headers: {
						'Content-Type': 'application/json',
					},
					redirect: 'follow', // manual, *follow, error
					referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
					body: JSON.stringify( data ), // body data type must match "Content-Type" header
				} )
					.then( ( js_data ) => js_data.json() )
					.then( ( response ) => {
						if ( response.success ) {
							step_cookieData = getCookie( step_cookie );
							const prev_control_id = response.prev_control_id;

							step_cookieData =
								step_cookieData.length > 0
									? JSON.parse(
											decodeURIComponent(
												step_cookieData
											)
									  )
									: {};

							if (
								prev_control_id &&
								step_cookieData.hasOwnProperty(
									prev_control_id
								)
							) {
								step_cookieData[ prev_control_id ].conversion =
									'yes';

								setCookie(
									step_cookie,
									encodeURIComponent(
										JSON.stringify( step_cookieData )
									),
									cartflows.analytics_cookie_expire_time
								);
							}
							step_cookieData[
								cartflows.control_step
							] = JSON.parse( response.current_step_visit );

							setCookie(
								step_cookie,
								encodeURIComponent(
									JSON.stringify( step_cookieData )
								),
								cartflows.analytics_cookie_expire_time
							);
						}
					} );
			} catch ( error ) {
				console.log( error );
			}
		}
	}

	$( function () {
		load_frontend_analytics();
	} );
} )( jQuery );
