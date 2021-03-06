#!/usr/bin/env node

/*

Responsible for transforming the json data from the format ActivityInfo provides into
a more workable, readable version.

Run with `node transformJSON.js`

 */

var fs = require('fs');
var _ = require('underscore');

/*
Helper method used to take a services referral information and
transform it into an object like:
{
	'required': true|false,
	'type':'some string description'
}

@param service:  the service we want to transform referral info for.
 */
var transformReferralMethod = function(service) {
	// Check if this feature has referral method "No Referral"
    referralData = service.properties["10. Referral Method"];
     /*
     *  There are 7 possible values:
     *  "Email on a per case basis"
     *  "Referrals not accepted"       <-- marked as referral-not-required
     *  "IA Form"
     *  "Telephone on a per case basis"
     *  "RAIS"
     *  "Referral is not required"     <-- marked as referral-not-required
     *  And not defined at all         <-- marked as referral-not-required
     *
     *  The rest are marked as referral-required
     */

    var referralRequired = false;
    var referralType = null;

    if (referralData) {
    	if (referralData["Referrals not accepted"] === true || referralData["Referral is not required"]) {
    		referralRequired = false;
    	} else {
    		referralRequired = true;
    	}

    	_.each(referralData, function (val, type_description) {
    		referralType = type_description;
        });
    }

    var referral = new Object();
    referral.required = referralRequired;
    referral.type = referralType;
    // console.log(referral);
    return referral;
}


/*

Helper used to transform the 'details' section of a service. Details are anything
that is prefixed by a number in the ActivityInfo json format.

The result of this is a list of dictionaries like:

[
 {"Availability": "Every Day"},
 {"Availability Day": "Sun-Thurs"},
 {"Accessibility": "Walk-in & Outreach"}
]

@param service: the service for which details we want to transform.
 */
var transformServiceDetails = function(service) {
	var propList = [];
	var hours = {}
	_.each(service.properties, function(key, property_name) {
        var tempArray = property_name.split(".");
        if (property_name != 'comments' && tempArray.length > 1) {
        	var integerPrefix = parseInt(tempArray[0], 10);
            if (integerPrefix) {
                var obj = {};
				// Properties starting with 8 or 9 relate to opening hours/closing hours
                if (integerPrefix != 8 && integerPrefix != 9) {
                    var detailsKey = tempArray[1].trim();
                    // console.log(detailsKey);
                    _.each(service.properties[property_name], function (val, details_description) {
                        if (details_description) {
                            obj[detailsKey] = details_description;
                        }
                    });
                    propList.push(obj);
                } else {
					var hoursKey;
					if (integerPrefix == 8){
						hoursKey = "openAt"
					} else if (integerPrefix == 9) {
						hoursKey = "closedAt"
					}
                    _.each(service.properties[property_name], function (val, value) {
						if (hoursKey == "closedAt") {
							value = value.replace('Close at ','');
						}
						hours[hoursKey] = value;
                    });
                }
            }
        }
	});

    var service_properties = {
        "details": propList,
        "hours": hours
    }
	return service_properties;
}


/*
Transforms the data from activity info into a format that services
advisor can understand.
@param services: the list of services (from activity info)
@param language: the language we want the services to be translated in.
*/
var transformActivityInfoServices = function(services, language){
	transformedServices = [];

	for (var i = 0; i < services.length; i++){
		var serviceUntransformed = services[i];
		var serviceTransformed = new Object();
		serviceTransformed.id = serviceUntransformed.id;
		serviceTransformed.region = serviceUntransformed.properties.locationName;

		//Init the organization
		var organization = new Object();
		organization.name = serviceUntransformed.properties.partnerName;
		serviceTransformed.organization = organization;

		//Init the category
		var category = new Object();
		category.name = serviceUntransformed.properties.activityCategory;

		var subCategory = new Object();
		subCategory.name = serviceUntransformed.properties.activityName;
		category.subCategory = subCategory;
		serviceTransformed.category = category;

		serviceTransformed.startDate = serviceUntransformed.properties.startDate;
		serviceTransformed.endDate = serviceUntransformed.properties.endDate;

		var servicesProvided = [];
		for (indicator in serviceUntransformed.properties.indicators) {
			if(serviceUntransformed.properties.indicators[indicator] === 1) {
				servicesProvided.push(indicator);
			}
		}
		serviceTransformed.servicesProvided = servicesProvided;

		var locationFeature = new Object();
		locationFeature.type = "Feature";
		locationFeature.geometry = serviceUntransformed.geometry;
		serviceTransformed.location = locationFeature;

		var service_properties = transformServiceDetails(serviceUntransformed);
        serviceTransformed.details = service_properties.details;
        serviceTransformed.hours = service_properties.hours;

		serviceTransformed.referral = transformReferralMethod(serviceUntransformed);

		transformedServices.push(serviceTransformed);
	}
	return transformedServices;
}


// Truncate Comments from compile.json file
var untransformedServices = require('./services.json');

services = transformActivityInfoServices(untransformedServices, 'EN');

for (var i = 0; i < services.length; i++) {
    delete services[i].comments;
}

var outputFilename = '../js/services_EN.json';

fs.writeFile(outputFilename, JSON.stringify(services), function (err) {
    if (err) {
        console.log(err);
    }
});


