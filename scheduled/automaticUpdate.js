var cron = require('node-cron');
var async = require('async');
var asyncLoop = require('node-async-loop');
var request = require('request');
var Instance = require('../models/instance');
// Every 24 hours: 0 0 * * *
// Using every 10 seconds for testing purposes

cron.schedule('0 0 * * *', function(){
  // Get all instances from DB
  Instance.find({}, function(err, instances){
      if (err){
          res.send(err);
      }
      // Iter every instance
      asyncLoop(instances, function(instance, next){
          var instanceUrl = instance.url;
          var intermine_endpoint = instanceUrl + "/service/version/intermine";
          var release_endpoint = instanceUrl + "/service/version/release";
          var api_endpoint = instanceUrl + "/service/version";
          var branding_endpoint = instanceUrl + "/service/branding";
          async.parallel([
              function(callback){
                  request.get(intermine_endpoint, function(err, response, body){
                      instance.intermine_version =  body.replace(/[`'"<>\{\}\[\]\\\/]/gi, '').trim();
                      callback(null, true);
                  });
              },
              function(callback){
                  request.get(release_endpoint, function(err, response, body){
                      instance.release_version =  body.replace(/[`'"<>\{\}\[\]\\\/]/gi, '').trim();
                      callback(null, true);
                  });
              },
              function(callback){
                  request.get(api_endpoint, function(err, response, body){
                      instance.api_version =  body.replace(/[`'"<>\{\}\[\]\\\/]/gi, '').trim();
                      callback(null, true);
                  });
              },
              function(callback){
                  request.get(branding_endpoint, function(err, response, body){
                      if (err){
                          res.send(err);
                      } else {
                        var JSONbody = JSON.parse(body);
                        instance.colors = JSONbody.properties.colors;
                        instance.images = JSONbody.properties.images;
                      }
                      callback(null, true);
                  });
              }
          ], function (err, results){
              instance.last_time_updated = new Date();
              instance.release_version = instance.api_version === instance.release_version ? "" : instance.release_version;
              instance.intermine_version = instance.api_version === instance.intermine_version ? "" : instance.intermine_version;

              // After all updates have been done. Save Instance
              instance.save(function(err){
                  if (err){
                      console.log('Error Updating: ' + instance.name);
                  } else {
                      console.log("Instance " + instance.name +" Versions & Branding Updated");
                  }
              });
              next();
          });
      });
  });
});