var portal = {
	url_api: 'http://localhost:8080/json/',
	url_scripts: 'js/',
	url_widgets: 'widgets/',
	ver: '800-000-1616.95.20150622',
};

var dev = {
	log: {
		error: 'background-color: #EEEEEE; color: #D32F2F',
		info: 'background-color: #EEEEEE; color: #1976D2',
		success: 'background-color: #EEEEEE; color: #00796B'
	}
};

console.log('%cURL_API : "' + portal.url_api + '"', dev.log.info);
console.log('%cURL_Scripts : "' + portal.url_scripts + '"', dev.log.info);
console.log('%cURL_Widgets : "' + portal.url_widgets + '"', dev.log.info);
console.log('%cVersion : "' + portal.ver + '"', dev.log.info);



// Base Functions
function randomNum(min, max, whole) {
	return void 0 === whole || !1 === whole ? Math.random() * (max - min + 1) + min : !isNaN(parseFloat(whole)) && 0 <= parseFloat(whole) && 20 >= parseFloat(whole) ? (Math.random() *(max - min + 1) + min).toFixed(whole) : Math.floor(Math.random() * (max - min + 1)) + min;
}

function getParameter(name) {
	var parameter = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]"),
	    regex = new RegExp("[\\?&]" + parameter + "=([^&#]*)"),
	    results = regex.exec(location.search);
	return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function getData(requestUrl, requestType, responseType, parameters, $this, callback) {
	var request = $.ajax({
	    type: requestType,
	    url: requestUrl,
	    data: parameters,
	    dataType: responseType
	});

	request.done(function(data, status, xhr) {
		callback($this, data);
	});

	request.fail(function(xhr, status, error) {
		callback($this, null);
		console.log('%cError when requesting to "' + requestUrl + '". ' + 'Please check your parameters or connection.', dev.log.error);
	});
}

function checkLocalStorage() {
	if (!Modernizr.localstorage) {
		window.location.replace = "not_supported.html";
	}
}

function checkDevice() {
	var userAgent = navigator.userAgent.toLowerCase();

	if (/windows phone/i.test(userAgent)) {
		return "windowsPhone";
	} else if (/android/i.test(userAgent)) {
		return "Android";
	} else if (/ipad|iphone|ipod/i.test(userAgent)) {
		return "iOS";
	} else {
		return "Browser";
	}
}

function checkLogin(needLogin, gotoUrl) {
	var dtk = localStorage.dtk;

	if (needLogin) {
		if (dtk) {
			window.location.replace(gotoUrl);
		} else {
			parseDocument();
		}
	} else {
		if (dtk) {
			parseDocument();
		} else {
			window.location.replace(gotoUrl);
		}
	}
}

function registerNewDevice(drid, response) {
	if (response.wpCode === '999') {
		localStorage.setItem('pdid', response.pdid);
		localStorage.setItem('drid', drid);
		parseWidget();
	} else {
		console.log('%cError When Registering New Device', dev.log.error);
		console.log('%cError Code : "' + response.wpCode +'"', dev.log.error);
		console.log('%cError Message : "' + response.wpMessage +'"', dev.log.error);
		// window.location.replace('error.html');
	}
}

// Parser
function parseDocument() {
	checkLocalStorage();

	console.log('%cpdid : ' + localStorage.pdid, dev.log.info);
	console.log('%cdrid : ' + localStorage.drid, dev.log.info);
	console.log('%cdtk : ' + localStorage.dtk, dev.log.info);

	var pdid = localStorage.pdid;
	var drid = localStorage.drid;
	var parameters = {};

	if (pdid && drid) {
		parseWidget();
	} else {
		drid = randomNum(1, 100000000000, 0);
		parameters.ver = portal.ver;
		parameters.drid = drid;
		parameters.userDevice = checkDevice();
		getData(portal.url_api + 'registerNewDevice', 'POST', 'json', parameters, drid, registerNewDevice);
	}
}

function parseWidget() {
	$(document).find('[data-wp-widget]').each(function() {
		var $this = $(this);
		var widgetParams = $this.data('wp-widget');
		getData(portal.url_widgets + widgetParams.URL.trim(), 'GET', 'html', null, $this, parseApiName);
	});
}

function parseApiName($this, pageContent) {
	if (pageContent) {
		$this.after(pageContent);

		var $pageContent = $this.next();
		var widgetParams = $this.data('wp-widget');

		var formMapping = widgetParams.form_mapping;
		if (formMapping) {
			var $formInPageContent = $pageContent.find('form');

			for (var formAttr in formMapping) {
				$formInPageContent.attr(formAttr, formMapping[formAttr]);
			}

			var formValidation = widgetParams.form_validation;
			if (formValidation) {
				new FormValidator(formMapping.id, formValidation, function(errors, event) {
					validatorResult(errors, event, formSend);
				});
			}
		}

		var widgetTitle = widgetParams.title;
		if (widgetTitle) {
			$pageContent.find('[data-wp-widget="title"]').each(function() {
				$(this).text(widgetTitle);
			});
		}

		$.each($this.data(), function(dataName, dataValue) {
			$pageContent.data(dataName, dataValue);
		});

		$this.remove();

		var apiName = widgetParams.api_name;
		if (apiName) {
			var api_params_in = widgetParams.api_params_in;
			var paramEnforce = widgetParams.api_params_in.enforce;
			var parameters = {};

			parameters.pdid = localStorage.pdid;
			parameters.drid = localStorage.drid;
			parameters.dtk = localStorage.dtk;

			for (var param_name in api_params_in) {
				if (paramEnforce == 'true') {
					if (param_name != "enforce") {
						parameters[param_name] = api_params_in[param_name];
					}
				} else {
					var valueFromRequest = getParameter(param_name);
					if (valueFromRequest === '') {
						if (param_name != "enforce")
							parameters[param_name] = api_params_in[param_name];
					} else {
						parameters[param_name] = valueFromRequest;
					}
				}
			}

			getData(portal.url_api+apiName, 'POST', 'json', parameters, $pageContent, parseData);
		}
	} else {
		console.log('%cError When Parsing Api Names', dev.log.error);
	}
}

function parseData($this, data) {
	if (data) {
		if (data.wpCode === '999') {
			var widgetParams = $this.data('wp-widget');
			var apiName = widgetParams.api_name;
			var field_name = widgetParams.api_params_out.field_name;
			var field_data = data[field_name];
			var field_mapping = widgetParams.field_mapping;
			var $apiLoops = $this.find('[data-wp-loop]');

			var indexLoop = 0;
			$($apiLoops).each(function() {
				$thisApiLoop = $(this);

				var wpLoop = $thisApiLoop.data('wp-loop');
				var $apiRecords = $thisApiLoop.find('[data-wp-record="record"]');
				var indexApiRecord = 0;

				if (wpLoop === 'list_parent') {
					var fieldKey = widgetParams.api_params_out.field_key;
					var fieldParent = widgetParams.api_params_out.field_parent;
					var parent_data = $.grep(field_data, function(e) {
						return e[fieldParent] === null;
					});

					$($apiRecords).each(function() {
						parseRecord($thisApiLoop, $(this), '[data-wp-widget]', field_mapping, parent_data, fieldKey);
						indexApiRecord++;
					});

					for (var indexParentRecord = 0; indexParentRecord < parent_data.length; indexParentRecord++) {
						var children_data = $.grep(field_data, function(e) {
							return e[fieldParent] == parent_data[indexParentRecord][fieldKey];
						});

						var $parentRecord = $thisApiLoop.find('[data-wp-record-parent="'+parent_data[indexParentRecord][fieldKey]+'"]');

						var $childApiLoops = $parentRecord.find('[data-wp-loop-child="list"]');

						$($childApiLoops).each(function(){
							var $this = $(this);
							var $childrenRecords = $this.find('[data-wp-record-child="record"]');
							$($childrenRecords).each(function(){
								parseRecord($this, $(this), '[data-wp-widget-child]', field_mapping, children_data, fieldKey);
							});
						});
					}
				} else {
					$($apiRecords).each(function() {
						parseRecord($thisApiLoop, $(this), '[data-wp-widget]', field_mapping, field_data, null);
						indexApiRecord++;
					});
				}

				indexLoop++;
			});

			if (data.wpDisabled == 'true') {
				$this.find('[data-wp-disabled]').attr('disabled', true).text('Applied');
			}
			
		} else {
			console.log('%cError When Parsing Datas with WPCode : "' + data.wpCode + '", Message : "' + data.wpMessage + '"', dev.log.error);
		}
	} else {
		console.log('%cError When Parsing Datas with WPCode : "' + data.wpCode + '", Message : "' + data.wpMessage + '"', dev.log.error);
	}
}

function parseRecord($thisApiLoop, $thisApiRecord, dataFieldToFill, field_mapping, field_data, fieldKey) {
	if (field_data.length) {
		for (var indexRecord = 0; indexRecord < field_data.length; indexRecord++) {
			var $apiFields = $thisApiRecord.find(dataFieldToFill);
			$($apiFields).each(function() {
				parseDataField($(this), field_mapping, field_data[indexRecord]);
			});

			if (fieldKey) {
				$thisApiRecord.attr('data-wp-record-parent',field_data[indexRecord][fieldKey]);
			}

			$thisApiLoop.append($thisApiRecord.clone());
		}
		$thisApiRecord.first().remove();
	} else {
		var $apiField = $thisApiRecord.find('[data-wp-widget]');
		$($apiField).each(function(){
			parseDataField($(this), field_mapping, field_data);
		});
	}
}

function parseDataField($thisApiField, field_mapping, field_data) {
	var fieldMappingElement = field_mapping[$thisApiField.data('wp-widget')];

	if (!fieldMappingElement) {
		fieldMappingElement = field_mapping[$thisApiField.data('wp-widget-child')];
	}

	if ($thisApiField.prop('tagName') == 'A') {
		if (fieldMappingElement) {
			var href = fieldMappingElement.href;
			var hrefType = fieldMappingElement.href_type;
			var dataTitle = fieldMappingElement['data-title'];

			if (hrefType === 'dynamic'){
				href = field_data[fieldMappingElement.href];
			}

			href = href + "?";

			var wpHrefParams = fieldMappingElement.href_params;

			if (wpHrefParams) {
				var fieldLinks = wpHrefParams.split(',');
				if (fieldLinks) {
					var indexFieldLink = 0;
					while (indexFieldLink < fieldLinks.length) {
						var fieldLinkName = fieldLinks[indexFieldLink].trim();
						href = href + fieldLinkName + "=" + field_data[fieldLinkName] + "&";
						indexFieldLink++;
					}
				}
			}

			href = href.substring(0, (href.length-1) );

			var textLink = field_data[fieldMappingElement.text];
			if (textLink) {
				$thisApiField.text(field_data[fieldMappingElement.text]);
			}

			if (href != null && href != "null") {
				$thisApiField.attr('href', href);
			} else {
				$thisApiField.attr('href', '#');
			}
			
			$thisApiField.attr('data-title', field_data[dataTitle]);
		}
		
	} else if ($thisApiField.prop('tagName') == 'TEXTAREA') {
		if (fieldMappingElement) {
			$thisApiField.val(field_data[fieldMappingElement.value]);
		}
		
	} else {
		for (var fieldMappingElementAttr in fieldMappingElement) {
			if (fieldMappingElementAttr === 'text') {
					
					if( (field_data[fieldMappingElement[fieldMappingElementAttr]]!=null) && (field_data[fieldMappingElement[fieldMappingElementAttr]]!="undefined") ){
						// console.log("ini ada datanya");
						$thisApiField.text(field_data[fieldMappingElement[fieldMappingElementAttr]]);
					} else {
						// console.log("ini gak ada datanya!");
						var btne = $thisApiField.closest('.block-to-none');
						var btnse = $thisApiField.closest('.block-to-none-single');

						if (!btne.find('.block-to-none-item').length) {
							btnse.css('display', 'none');
							var btnseVisibility = btne.find('.block-to-none-single:visible');
							if ($(btnseVisibility).length == 0) {
								btne.css('display', 'none');
							}
						}

						//ini untuk menghapus section di dalam section
						/*if ($thisApiField.hasClass('block-to-none-item')) {
							$thisApiField.css('display', 'none');
						} else {
							$thisApiField.closest('.block-to-none-item').css('display', 'none');
						}*/
						
					}
				
		} else if (fieldMappingElementAttr === 'dateFormat'){
				var dateFormat = fieldMappingElement.dateFormat;
				var field_datax = parseInt(field_data[fieldMappingElement.text]);
				var dt = new Date(field_datax);

				if (!isNaN(dt.getTime())) {
					$thisApiField.text(dt.toString(dateFormat));
				}

				if (dateFormat !== null && dateFormat === 'timeline') {
					var dtx = new Date();
					var timeline = dtx.getFullYear() - dt.getFullYear();

					timelineString = timeline.toString() + 'yr';

					if (timeline > 1) {
						lineString = timeline.toString() + 'yrs';
					}

					if (timeline <= 0) {
						timeline = dtx.getMonth() - dt.getMonth();
						timelineString = timeline.toString() + 'mth';
					}

					if (timeline <= 0) {
						timeline = dtx.getDayOfYear() - dt.getDayOfYear();
						timelineString = timeline.toString() + 'd';

						if (timeline < 1) {
							timeline = dtx.getTime() - dt.getTime();
							var timelineVal = parseInt(timeline / 3600000);
							var timelineString = timelineVal.toString() + 'h';
							if (timelineVal <= 0) {
								timelineVal = parseInt(timeline / 60000);
								timelineString = timelineVal.toString() + 'm';
							}
						}
					}

					$thisApiField.text(timelineString);
				}
				

				if ($thisApiField.prop('tagName') == 'INPUT') {
					$thisApiField.val(convertTimestamp(field_datax));
				}
			} else {
				$thisApiField.attr(fieldMappingElementAttr, field_data[fieldMappingElement[fieldMappingElementAttr]]);
			}
		}
	}
}



// Date
function convertTimestamp(timestamp, type) {
	var d = new Date(timestamp + '000' * 1000),
		yyyy = d.getFullYear(),
		mm = ('0' + (d.getMonth() + 1)).slice(-2),
		m = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
		month = m[d.getMonth()],
		dd = ('0' + d.getDate()).slice(-2),
		day = d.getDate(),
		hh = d.getHours(),
		h = hh,
		min = ('0' + d.getMinutes()).slice(-2),
		ampm = 'AM',
		time;

	if (hh > 12) {
		h = hh - 12;
		ampm = 'PM';
	} else if (hh === 12) {
		h = 12;
		ampm = 'PM';
	} else if (hh == 0) {
		h = 12;
	}

	time = day + ' ' + month + ' ' + yyyy;
		
	return time;
}

// Forms
function validatorResult(errors, event, callback) {
	$(event.target).find('.error-message').remove();

	if (errors.length > 0) {
		$(errors[0].element).focus().closest('.form-group').append('<p class="error-message">' + errors[0].message + '</p>');
	} else {
		event.preventDefault();
		if (typeof(callback) == 'function') {
			callback(event.target);
		}
	}
}

function formSend(form) {
	
	event.preventDefault();
	
	var $form = $(form);
	var apiName = $form.attr('action');
	var parameters = {};
	
	console.log('ini $form: ');
	console.log($form);
	console.log('ini apiName: ');
	console.log(apiName);

	if (apiName) {
		$form.find('input, textarea, select').each(function(i, field) {
			if (field.type == 'radio' || field.type == 'checkbox') {
				parameters[field.name] = $(field).attr('checked');
			} else {
				parameters[field.name] = field.value;
			}
		});

		parameters.pdid = localStorage.pdid;
		parameters.drid = localStorage.drid;
		parameters.dtk = localStorage.dtk;
		
		console.log('ini parameter: ');
		console.log(parameters);
		
		console.log('ini portal.url_api+apiName: '+portal.url_api+apiName);

		getData(portal.url_api+apiName, 'POST', 'json', parameters, $form, getResponse);
			
		//alert(response);
		function getResponse($form, response){	
			console.log('ini $form: ');
			console.log($form);
			console.log('ini response: ');
			console.log(response);
			console.log('ini data wpcodenya: '+response.wpCode);
			if (response.wpCode === '999') {
				console.log('%cPlease provide your calbback', dev.log.info);
			} else {
				console.log('%cError When Registering New Device', dev.log.error);
				console.log('%cError Code : "' + response.wpCode +'"', dev.log.error);
				console.log('%cError Message : "' + response.wpMessage +'"', dev.log.error);
			}
		}	
		

	}
}
