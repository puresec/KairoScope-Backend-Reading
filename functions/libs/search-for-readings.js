'use strict';

const log = require('../../libs/log');
const { getDB } = require('../../libs/MongoDBHelper');
const findHexagramImages = require('./find-hexagram-images');

const { readingCollectionName } = process.env;
/** Working with method below to search readings based on the hexagram.
  * @param {object} query is an object that has reading's information that a user wants to search.
  * @param {function} callback is the function that will be executed after this function's call.
  * @param {object} results is the object that comes from hexagram search.
  * @return {null} No return.
*/
function searchForReadings(query, callback, results) {
  // assemble query object for MongoDB
  const queryArray = [];
  if (query.people) queryArray.push({ people: new RegExp(`.*${query.people}.*`) });
  if (query.userId) queryArray.push({ user_id: query.userId });
  if (results) {
    // if no img_arr was found, it means not such combination exsite. Give a empty array and quit.
    if (results.length === 0) {
      callback([]);
      return;
    }
    // if users used hexagrams' criterias, add img_arr for the searching criteria
    const hexagramQuery = [];
    results.forEach(element => {
      hexagramQuery.push({ hexagram_arr_1: element.img_arr });
      hexagramQuery.push({ hexagram_arr_2: element.img_arr });
    });
    queryArray.push({ $or: hexagramQuery });
  }
  // Start to deal with start date and end date
  if (query.endDate) {
    const endDate = new Date(query.endDate);
    endDate.setDate(endDate.getDate() + 1);
    queryArray.push({
      $and: [{ date: { $gte: new Date(query.startDate) } }, { date: { $lt: new Date(endDate) } }],
    });
  } else if (query.startDate) {
    /* If just one date is given, set the search criteria between that day's 00:00 to next day's 00:00 */
    const endDate = new Date(query.startDate);
    endDate.setDate(endDate.getDate() + 1);
    queryArray.push({
      $and: [{ date: { $gte: new Date(query.startDate) } }, { date: { $lt: endDate } }],
    });
  }
  if (queryArray.length === 0) queryArray.push({}); // if no one searching criteria was given, give a empty array to query, which will pull out all readings.

  getDB().collection(readingCollectionName)
    .find({ $and: queryArray }).sort({ date: -1 })
    .toArray((err, result) => {
      if (err) log.error(`searchForReadings: ${err}`);
      if (result.length !== 0) findHexagramImages(result, callback);
      callback(result);
    });
}

module.exports = searchForReadings;
