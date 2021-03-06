/* global ajaxurl, SiteHealth, wp */
jQuery( document ).ready(function( $ ) {
	var data;
	var isDebugTab = $( '.health-check-debug-tab.active' ).length;

	$( '.site-health-view-passed' ).on( 'click', function() {
		var goodIssuesWrapper = $( '#health-check-issues-good' );

		goodIssuesWrapper.toggleClass( 'hidden' );
		$( this ).attr( 'aria-expanded', ! goodIssuesWrapper.hasClass( 'hidden' ) );
	} );

	function AppendIssue( issue ) {
		var template = wp.template( 'health-check-issue' ),
			issueWrapper = $( '#health-check-issues-' + issue.status ),
			heading,
			count;

		SiteHealth.site_status.issues[ issue.status ]++;

		count = SiteHealth.site_status.issues[ issue.status ];

		if ( 'critical' === issue.status ) {
			if ( count <= 1 ) {
				heading = SiteHealth.string.site_info_heading_critical_single.replace( '%s', '<span class="issue-count">' + count + '</span>' );
			} else {
				heading = SiteHealth.string.site_info_heading_critical_plural.replace( '%s', '<span class="issue-count">' + count + '</span>' );
			}
		} else if ( 'recommended' === issue.status ) {
			if ( count <= 1 ) {
				heading = SiteHealth.string.site_info_heading_recommended_single.replace( '%s', '<span class="issue-count">' + count + '</span>' );
			} else {
				heading = SiteHealth.string.site_info_heading_recommended_plural.replace( '%s', '<span class="issue-count">' + count + '</span>' );
			}
		} else if ( 'good' === issue.status ) {
			if ( count <= 1 ) {
				heading = SiteHealth.string.site_info_heading_good_single.replace( '%s', '<span class="issue-count">' + count + '</span>' );
			} else {
				heading = SiteHealth.string.site_info_heading_good_plural.replace( '%s', '<span class="issue-count">' + count + '</span>' );
			}
		}

		if ( heading ) {
			$( '.site-health-issue-count-title', issueWrapper ).html( heading );
		}

		$( '.issues', '#health-check-issues-' + issue.status ).append( template( issue ) );
	}

	function RecalculateProgression() {
		var r, c, pct;
		var $progress = $( '.site-health-progress' );
		var $progressCount = $progress.find( '.site-health-progress-count' );
		var $circle = $( '.site-health-progress svg #bar' );
		var totalTests = parseInt( SiteHealth.site_status.issues.good, 0 ) + parseInt( SiteHealth.site_status.issues.recommended, 0 ) + ( parseInt( SiteHealth.site_status.issues.critical, 0 ) * 1.5 );
		var failedTests = parseInt( SiteHealth.site_status.issues.recommended, 0 ) + ( parseInt( SiteHealth.site_status.issues.critical, 0 ) * 1.5 );
		var val = 100 - Math.ceil( ( failedTests / totalTests ) * 100 );

		if ( 0 === totalTests ) {
			$progress.addClass( 'hidden' );
			return;
		}

		$progress.removeClass( 'loading' );

		r = $circle.attr( 'r' );
		c = Math.PI * ( r * 2 );

		if ( 0 > val ) {
			val = 0;
		}
		if ( 100 < val ) {
			val = 100;
		}

		pct = ( ( 100 - val ) / 100 ) * c;

		$circle.css( { strokeDashoffset: pct } );

		if ( 1 > parseInt( SiteHealth.site_status.issues.critical, 0 ) ) {
			$( '#health-check-issues-critical' ).addClass( 'hidden' );
		}

		if ( 1 > parseInt( SiteHealth.site_status.issues.recommended, 0 ) ) {
			$( '#health-check-issues-recommended' ).addClass( 'hidden' );
		}

		if ( 50 <= val ) {
			$circle.addClass( 'orange' ).removeClass( 'red' );
		}

		if ( 90 <= val ) {
			$circle.addClass( 'green' ).removeClass( 'orange' );
		}

		if ( 100 === val ) {
			$( '.site-status-all-clear' ).removeClass( 'hide' );
			$( '.site-status-has-issues' ).addClass( 'hide' );
		}

		$progressCount.text( val + '%' );

		if ( ! isDebugTab ) {
			$.post(
				ajaxurl,
				{
					'action': 'health-check-site-status-result',
					'_wpnonce': SiteHealth.nonce.site_status_result,
					'counts': SiteHealth.site_status.issues
				}
			);
		}

		wp.a11y.speak( SiteHealth.string.site_health_complete_screen_reader.replace( '%s', val + '%' ) );
	}

	function maybeRunNextAsyncTest() {
		var doCalculation = true;

		if ( 1 <= SiteHealth.site_status.async.length ) {
			$.each( SiteHealth.site_status.async, function() {
				var data = {
					'action': 'health-check-site-status',
					'feature': this.test,
					'_wpnonce': SiteHealth.nonce.site_status
				};

				if ( this.completed ) {
					return true;
				}

				doCalculation = false;

				this.completed = true;

				$.post(
					ajaxurl,
					data,
					function( response ) {
						AppendIssue( response.data );
						maybeRunNextAsyncTest();
					}
				);

				return false;
			} );
		}

		if ( doCalculation ) {
			RecalculateProgression();
		}
	}

	if ( 'undefined' !== typeof SiteHealth ) {
		if ( 0 === SiteHealth.site_status.direct.length && 0 === SiteHealth.site_status.async.length ) {
			RecalculateProgression();
		} else {
			SiteHealth.site_status.issues = {
				'good': 0,
				'recommended': 0,
				'critical': 0
			};
		}

		if ( 0 < SiteHealth.site_status.direct.length ) {
			$.each( SiteHealth.site_status.direct, function() {
				AppendIssue( this );
			} );
		}

		if ( 0 < SiteHealth.site_status.async.length ) {
			data = {
				'action': 'health-check-site-status',
				'feature': SiteHealth.site_status.async[0].test,
				'_wpnonce': SiteHealth.nonce.site_status
			};

			SiteHealth.site_status.async[0].completed = true;

			$.post(
				ajaxurl,
				data,
				function( response ) {
					AppendIssue( response.data );
					maybeRunNextAsyncTest();
				}
			);
		} else {
			RecalculateProgression();
		}
	}
});
