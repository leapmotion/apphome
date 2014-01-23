var _ = require ('underscore');
var url = require('url');
var util = require('util');
var path = require('path');
var fs = require('fs');

module.exports = function(properties, config) {
  if (config){
    properties.validate = _validate(config);
  } else if (properties.hasOwnProperty('validationConfig')) {
    properties.validate = _validate(properties.validationConfig);

  }

  return properties;
};

function _validate(config) {
  return function(attrs, options) {
    var errors = [];
    _.each( config, function(config_item, key){
      var config_data = _validate_config(config_item, key, attrs);
      var err = _.bind(_validate_item, this)(attrs[config_data.name], config_data);
      if (err) {
        errors.push(err);
      }
    }, this);
    if (errors.length) {
      return errors.join("\n");
    }
  };
}

function _validate_config(config_item, key) {
  var e;
  var config_data;
  if (_.isString(config_item)) {
    config_data = {name: key, type: config_item};
  } else {
    if (!_.isObject(config_item)){
      e = new Error('bad validation config: ');
    } else {
      config_data = config_item;
    } // end if  not name, type
  } // end if string

  // we should have set config_data to an object ; validate its name, type properties -- the miinimal config
  if (!(config_data.name && config_data.type)){
    e = new Error('validation definition needs name && type');
    if (e) {
      e.config = config_data;
      e.key = key;
      throw e;
    }// end throw

  }
  return config_data;
}

function _validate_item(value, config_data){
  if (typeof value === 'undefined' || _.isNull(value)){
    if (!(config_data.hasOwnProperty('optional') && config_data.optional)){
      return 'Missing required field ' + config_data.name;
    }
  }

  var e;

  // at this point we have some sort of data for value.

  switch ( config_data.type){
    case 'file url|path':
      e = _validate_file_url_or_path(value, config_data.name, config_data.ext);
    break;

    case 'int':
      e = _validate_int(value, config_data.name);
    break;

    case 'string':
      e = _validate_string(value, config_data.name);
      break;

    default:
      e = 'bad config type ' + config_data.type;
  }

  return e;
}

var IMAGE_EXTENSIONS = ['jpg', 'png', 'gif', 'jpeg', 'bmp'];
var ARCHIVE_EXTENSIONS = ['zip', 'gz', 'dmg', 'pkg', 'tar', 'js'];

var IMAGE_OR_ARCHIVE_EXTENSIONS = IMAGE_EXTENSIONS.concat(ARCHIVE_EXTENSIONS);

function _get_ext(ext){

  if (!ext){
    ext = IMAGE_OR_ARCHIVE_EXTENSIONS;
  }

    switch(ext){
      case 'image':
      ext = IMAGE_EXTENSIONS;
      break;

      case 'archive':
      ext = ARCHIVE_EXTENSIONS;
    }
    return ext;
}

function _validate_file_url(value, name, ext){
  var url_props = url.parse(value);


  if (!url_props.pathname){
    return 'no path for url ' + value + ' passed for ' + name;
  } else {
    ext = _get_ext(ext);
    var extension = path.extname(url_props.pathname).toLowerCase().replace('.', '');
    if (!_.contains(ext, extension)){
      return 'bad extension for ' + value + ' passed for ' + name;
    }
  }

  return false;
}

function _is_url(value){
    var data = url.parse(value);
    return !!data.protocol;
}

function _validate_file_path(value, name){
  if (!fs.existsSync(value)){
    return 'file not found ' + value + 'passed for ' + name;
  }
  return false;
}

function _validate_file_url_or_path(value, name, ext){
  if (_is_url(value)){
    return _validate_file_url(value, name, ext);
  } else {
    return _validate_file_path(value, name);
  }
}

function _validate_string(value, name){
  if (!_.isString(value)){
    return 'non string ' + value + ' passed for ' + name;
  }
  return false;
}

function  _validate_int(value, name){
  if (! _.isNumber(value) ){
    return 'non number ' + value + ' passed for ' + name;
  } else if(Number(value) != Math.round(value)){
    return 'non integer ' + value + ' passed for ' + name;
  }
  return false;
}
