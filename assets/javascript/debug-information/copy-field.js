/* global ClipboardJS, SiteHealth, wp */
jQuery( document ).ready( function( $ ) {
	var clipboard;

	if ( 'undefined' !== typeof ClipboardJS ) {
		clipboard = new ClipboardJS( '.site-health-copy-buttons .copy-button' );

		// Debug information copy section.
		clipboard.on( 'success', function( e ) {
			var $wrapper = $( e.trigger ).closest( 'div' );

			$( '.success', $wrapper ).addClass( 'visible' );

			wp.a11y.speak( SiteHealth.string.site_info_copied );
		});
	}
});
