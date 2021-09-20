const mongoose = require('mongoose')

const Url = require('./../models/urlModel')
const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')
const _ = require('underscore')
const randomize = require('randomatic')

const geoip = require('geoip-lite')

const { getName } = require('country-list');

const dayjs = require('dayjs')

const utc = require('dayjs/plugin/utc')

dayjs.extend(utc)

const request = require('request')

const urlFactory = require('./urlHandlerFactory')

exports.setUserId = (req, res, next) => {
  if (!req.body.user) {
    req.body.user = req.params.userid
  }
  next()
}

exports.getUrl = catchAsync(async (req, res, next) => {
  const url = await Url.findById(req.params.urlid)

  if (!url) {
    return next(new AppError(`No such shorten URL: ${req.params.urlid}`, 404))
  }

  res
    .status(201)
    .json({
      status: 'success',
      message: {
        url
      }
    })
})

exports.getAllUrls = urlFactory.getAll(Url)

exports.updateLink =  catchAsync(async (req, res, next) => {

  const linkCandidateToUpdate = await Url.findById(req.params.id)

  if(!linkCandidateToUpdate) {
    return next((new AppError('No link with the given name', 404)))
  }

  if(linkCandidateToUpdate.creator._id != req.body.userId) {
    return next((new AppError('You are not allowed to change this link', 403)))
  }

  const linkToUpdate = await Url.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  })

  if(!linkToUpdate) {
    return next((new AppError('Smth. went wrong. Please try again', 500)))
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: linkToUpdate
    }
  })
})

exports.getDeviceAllLinksStats = catchAsync(async (req, res, next) => {

  const deviceAllLinksStats = await Url.aggregate([
    {
      $match: {
        creator: {
          $eq: mongoose.Types.ObjectId(req.body.userId)
        }
      }
    },
    {
      $facet: {
        "donutDevice": [
          {
            $project: {
              clicks: {
                  $filter: {
                    input: "$clicks",
                    as: "click",
                    cond: {
                      $and: [
                        { $gte: [ "$$click.dateUTC", req.body.dateFrom ] },
                        { $lte: [ "$$click.dateUTC", req.body.dateTo ] },
                      ]
                    }
                  }
               }
            }
          },
          {
            $unwind: '$clicks'
          },
          {
            $group: {
              _id: {
                mobile:'$clicks.useragent.isMobile',
                desktop:'$clicks.useragent.isDesktop'
              },
              numOfClicks: {
                $sum: 1
              }
            }
          }
        ]
      }
    }
  ])
  if (!deviceAllLinksStats) {
    return next(new AppError('Can not aggregate data', 404))
  }
  res.status(200).json({
    status: 'success',
    data: {
      stats: deviceAllLinksStats
    }
  })
})

/** Start of DashboardHomeStats Handler */
exports.getDashboardHomeStats = catchAsync(async (req, res, next) => {
  const dashboardHomeStats = await Url.aggregate([
    {
      $match: {
        creator: {
          $eq: mongoose.Types.ObjectId(req.body.userId)
        }
      }
    },
    {  
      $facet: {
        "mainGraph": [
          {
            $project: {
              clicks: {
                  $filter: {
                    input: "$clicks",
                    as: "click",
                    cond: {
                      $and: [
                        { $gte: [ "$$click.dateUTC", req.body.dateFrom ] },
                        { $lte: [ "$$click.dateUTC", req.body.dateTo ] },
                      ]
                    }
                  }
               }
            }
          },
          {
            $unwind: '$clicks'
          },
          {
            $group: {
              _id: '$clicks.dateUTCHuman',
              numOfClicks: {
                $sum: 1
              }
            }
          },
          {
            $sort: {
              _id: 1
            }
          }
        ],
        "totalClicks": [
          {
            $project: {
              clicks: {
                  $filter: {
                    input: "$clicks",
                    as: "click",
                    cond: {
                      $and: [
                        { $gte: [ "$$click.dateUTC", req.body.dateFrom ] },
                        { $lte: [ "$$click.dateUTC", req.body.dateTo ] },
                      ]
                    }
                  }
               }
            }
          },
          {
            $unwind: '$clicks'
          },
          {
            $group: {
              _id: '$clicks.dateUTCHuman',
              numOfClicks: {
                $sum: 1
              }
            }
          },
          {
            $group: {
              _id: 1,
              total: {
                $sum: '$numOfClicks'
              }
            }
          },
        ],
        "newLinks": [
          { 
            $match: {
              createdAt: {
                $gte: new Date(req.body.dateFrom), 
                $lte: new Date(req.body.dateTo)
              }
            }
          },
          {
            $group: {
              _id: '$_id'
            }
          }
        ],
        "traffic": [
          {
            $project: {
              clicks: {
                  $filter: {
                    input: "$clicks",
                    as: "click",
                    cond: {
                      $and: [
                        { $gte: [ "$$click.dateUTC", req.body.dateFrom ] },
                        { $lte: [ "$$click.dateUTC", req.body.dateTo ] },
                      ]
                    }
                  }
               }
            }
          },
          {
            $unwind: '$clicks'
            // Ernesto vs. Bastian - The Incredible Apollo (Radio Edit)
          },
          {
            $group: {
              _id: {
                mobile:'$clicks.useragent.isMobile',
                desktop:'$clicks.useragent.isDesktop'
              },
              numOfClicks: {
                $sum: 1
              }
            }
          }
        ],
        "trandingLinks": [
        
          {
            $project: {
              clicks: {
                  $filter: {
                    input: "$clicks",
                    as: "click",
                    cond: {
                      $and: [
                        { $gte: [ "$$click.dateUTC", req.body.dateFrom ] },
                        { $lte: [ "$$click.dateUTC", req.body.dateTo ] },
                      ]
                    }
                  },
               },
               urlAlias: '$urlAlias',
               _id: '$_id'
            }
          },
          {
            $unwind: '$clicks'
          },
          {
            $group: {
              _id: {
                urlAlias: '$urlAlias',
                id: '$_id'
              },
              numOfClicks: {
                $sum: 1
              }
            }
          },
          {
            $sort: {
              numOfClicks: -1 
            }
          }
        ],
        "recenttActivity": [
          {
            $unwind: '$clicks'
          },
          {
            $project: {
              time: '$clicks.dateUTC',
              urlAlias: '$urlAlias',
              _id: '$_id'
            }
          },
          {
            $match: {
              time: {
                $gte: req.body.dateFrom, 
                $lte: req.body.dateTo
              }
            }
          },
          {
            $sort: {
              time: -1
            }
          }
        ],
        "allClicksByHour": [
          {
            $project: {
              clicks: {
                $filter: {
                  input: "$clicks",
                  as: "click",
                  cond: {
                    $and: [
                      { $gte: [ "$$click.dateUTC", req.body.dateFrom ] },
                      { $lte: [ "$$click.dateUTC", req.body.dateTo ] },
                    ]
                  }
                }
              }
            }
          },
          {
            $unwind: '$clicks'
          },
          {
            $project : {
                hourPart : {
                    $hour: { $add: [ new Date(0), "$clicks.dateUTC" ] }
                }
            }
          }, 
          {
            $group: {
              _id: '$hourPart',
              numOfClicks: {
                $sum: 1
              }
            }
          },
          {
            $sort: {
              _id: 1
            }
          }
        ]
      }
    }
  ])

  if (!dashboardHomeStats) {
    return next(new AppError('Can not aggregate data', 404))
  }
  res.status(200).json({
    status: 'success',
    data: {
      stats: dashboardHomeStats,
      dateFrom: req.body.dateFrom,
      dateTo: req.body.dateTo
    }
  })
})
/** End of DashboardHomeStats Handler */


/** Start of Analitycs Overview Handler */

exports.getAnalitycsOverview = catchAsync(async (req, res, next) => {
  const analitycsOverview = await Url.aggregate([
    {
      $match: {
        creator: {
          $eq: mongoose.Types.ObjectId(req.body.userId)
        }
      }
    },
    {
      $facet : {
        "allClicksByDay": [
          {
            $project: {
              clicks: {
                  $filter: {
                    input: "$clicks",
                    as: "click",
                    cond: {
                      $and: [
                        { $gte: [ "$$click.dateUTC", req.body.dateFrom ] },
                        { $lte: [ "$$click.dateUTC", req.body.dateTo ] },
                      ]
                    }
                  }
               }
            }
          },
          {
            $unwind: '$clicks'
          },
          {
            $group: {
              _id: '$clicks.dateUTCHuman',
              numOfClicks: {
                $sum: 1
              }
            }
          },
          {
            $sort: {
              _id: 1
            }
          }
        ],
        "allClicksByHour": [
          // {
          //   $project : {
          //     hourPart : {
          //           $hour: { $add: [ new Date(0), "$click.dateUTC" ] }
          //       },
          //       // numOfClicks: {
          //       //         $sum: 1
          //       //       }
          //   }
          // },
          // {
          //   $unwind: '$hourPart'
          // },
          // {
          //   $group: { 
          //       _id: "$hourPart",
          //       numOfClicks: {
          //         $sum: 1
          //       }
          //   }
          // }
          {
            $project: {
              clicks: {
                $filter: {
                  input: "$clicks",
                  as: "click",
                  cond: {
                    $and: [
                      { $gte: [ "$$click.dateUTC", req.body.dateFrom ] },
                      { $lte: [ "$$click.dateUTC", req.body.dateTo ] },
                    ]
                  }
                }
              }
            }
          },
          {
            $unwind: '$clicks'
          },
          {
            $project : {
                hourPart : {
                    $hour: { $add: [ new Date(0), "$clicks.dateUTC" ] }
                }
            }
          }, 
          {
            $group: {
              _id: '$hourPart',
              numOfClicks: {
                $sum: 1
              }
            }
          },
          {
            $sort: {
              _id: 1
            }
          }
        ]
      }
    }
  ])
  if (!analitycsOverview) {
    return next(new AppError('Can not aggregate data', 404))
  }
  res.status(200).json({
    status: 'success',
    data: {
      stats: analitycsOverview,
      dateFrom: req.body.dateFrom,
      dateTo: req.body.dateTo
    }
  })
})

/** End of Analitycs Overview Handler */

/** Start of MyLinks Handler */
exports.getMyLinksStats = catchAsync(async (req, res, next) => {
  let targetDate = new Date(dayjs(req.body.dateTo).add(1, 'day')).toISOString()

  let targetDateFrom = new Date(dayjs(req.body.dateFrom)).toISOString()

  let dateToNow = dayjs(req.body.dateToNow).valueOf()
  let dateToNow1 = dayjs(req.body.dateToNow).endOf('day').valueOf()
  let date7dFrom = dayjs(req.body.dateToNow).subtract(7, 'day').valueOf()
  let date30dFrom = dayjs(req.body.dateToNow).subtract(30, 'day').valueOf()
  let date24hFrom = dayjs(req.body.dateToNow).subtract(24, 'hour').valueOf()

  if(req.body.dateFrom) {
    const myLinksStats = await Url.aggregate([
      // http://www.forwardadvance.com/course/mongo/mongo-aggregation/aggregation-group
      {
        $match: {
          creator: {
            $eq: mongoose.Types.ObjectId(req.body.userId)
          }
        }
      },
      {
        $facet: {
          "clicksByTimeRange": [
            {
              $match: {
                createdAt: {
                  $lte: new Date(targetDate),
                  $gte: new Date(targetDateFrom)
                }
              }
            },
            {
              $project: {
                _id: true,
                createdAt: true,
                longUrl: true,
                urlAlias: true,
                last7days: {
                  $size: {
                    $filter: {
                      input: '$clicks',
                      as: 'click',
                      cond: {
                        $and: [
                          { $gte: [ "$$click.dateUTC", date7dFrom ] },
                          { $lte: [ "$$click.dateUTC", dateToNow ] }
                        ]
                      }
                    },
                  }
                },
                last24hours: {
                  $size: {
                    $filter: {
                      input: '$clicks',
                      as: 'click',
                      cond: {
                        $and: [
                          { $gte: [ "$$click.dateUTC", date24hFrom ] },
                          { $lte: [ "$$click.dateUTC", dateToNow ] }
                        ]
                      }
                    },
                  }
                },    
                total: {
                  $size: '$clicks'
                }
              }
            }
          ],
          "uniqueIp": [
            {
              $match: {
                createdAt: {
                  $lte: new Date(dateToNow1)
                }
              }
            },
            
            {
              $group: {
                _id : {
                  id : "$_id",
                  ip: '$clicks.ip'
                },
              }
            }
          ]
        }
      }
    ])
    if (!myLinksStats) {
      return next(new AppError('Can not aggregate data', 404))
    }
    res.status(200).json({
      status: 'success',
      data: {
        stats: myLinksStats
      },
    })
  } else {
    const myLinksStats = await Url.aggregate([
      // http://www.forwardadvance.com/course/mongo/mongo-aggregation/aggregation-group
      {
        $match: {
          creator: {
            $eq: mongoose.Types.ObjectId(req.body.userId)
          }
        }
      },
      {
        $facet: {
          "clicksByTimeRange": [
            {
              $match: {
                createdAt: {
                  $lt: new Date(targetDate)
                }
              }
            },
            {
              $project: {
                _id: true,
                createdAt: true,
                longUrl: true,
                urlAlias: true,
                last7days: {
                  $size: {
                    $filter: {
                      input: '$clicks',
                      as: 'click',
                      cond: {
                        $and: [
                          { $gte: [ "$$click.dateUTC", date7dFrom ] },
                          { $lte: [ "$$click.dateUTC", req.body.dateToNow ] }
                        ]
                      }
                    },
                  }
                },
                last24hours: {
                  $size: {
                    $filter: {
                      input: '$clicks',
                      as: 'click',
                      cond: {
                        $and: [
                          { $gte: [ "$$click.dateUTC", date24hFrom ] },
                          { $lte: [ "$$click.dateUTC", req.body.dateToNow ] }
                        ]
                      }
                    },
                  }
                },    
                total: {
                  $size: '$clicks'
                }
              }
            }
          ],
          "uniqueIp": [
            {
              $match: {
                createdAt: {
                  $lte: new Date(req.body.dateTo)
                }
              }
            },
            
            {
              $group: {
                _id : {
                  id : "$_id",
                  ip: '$clicks.ip'
                },
              }
            }
          ]
        }
      }
    ])
    if (!myLinksStats) {
      return next(new AppError('Can not aggregate data', 404))
    }
    res.status(200).json({
      status: 'success',
      data: {
        stats: myLinksStats,
        dateTo: req.body.dateTo
      },
    })
  }
  
  
})
/** End of MyLinks Handler */

/** Start of EditLink handler */
exports.editOneLink = catchAsync(async (req, res, next) => {

  const url = await Url.findById(req.params.id)

  if (!url) {
    return next(new AppError(`No such shorten URL: ${req.params.id}`, 404))
  }

  let dateToNow = dayjs(req.body.dateToNow).valueOf()
  let date7dFrom = dayjs(req.body.dateToNow).subtract(7, 'day').valueOf()
  let date30dFrom = dayjs(req.body.dateToNow).subtract(30, 'day').valueOf()
  let date24hFrom = dayjs(req.body.dateToNow).subtract(24, 'hour').valueOf()

  const oneLinkStats = await Url.aggregate([
    {
      $match: {
        _id: {
          $eq: mongoose.Types.ObjectId(req.params.id)
        }
      }
    },
    {
      $facet: {
        "clicksByTimeRange" : [
          {
            $match: {
              createdAt: {
                $lte: new Date(dateToNow)
              }
            }
          },
          {
            $project: {
              _id: true,
              createdAt: true,
              longUrl: true,
              urlAlias: true,
              last7days: {
                $size: {
                  $filter: {
                    input: '$clicks',
                    as: 'click',
                    cond: {
                      $and: [
                        { $gte: [ "$$click.dateUTC", date7dFrom ] },
                        { $lte: [ "$$click.dateUTC", dateToNow ] }
                      ]
                    }
                  },
                }
              },
              last24hours: {
                $size: {
                  $filter: {
                    input: '$clicks',
                    as: 'click',
                    cond: {
                      $and: [
                        { $gte: [ "$$click.dateUTC", date24hFrom ] },
                        { $lte: [ "$$click.dateUTC", dateToNow ] }
                      ]
                    }
                  },
                }
              },
              last30days: {
                $size: {
                  $filter: {
                    input: '$clicks',
                    as: 'click',
                    cond: {
                      $and: [
                        { $gte: [ "$$click.dateUTC", date30dFrom ] },
                        { $lte: [ "$$click.dateUTC", dateToNow ] }
                      ]
                    }
                  },
                }
              },        
              total: {
                $size: '$clicks'
              }
            }
          }
        ],
        "uniqueIp": [
          {
            $match: {
              createdAt: {
                $lte: new Date(dateToNow)
              }
            }
          },
          {
            $group: {
              _id : {
                id : "$_id",
                ip: '$clicks.ip'
              },
            }
          }
        ],
        "mainGraph": [
          {
            $project: {
              clicks: {
                  $filter: {
                    input: "$clicks",
                    as: "click",
                    cond: { 
                      $and: [
                        { $gte: [ "$$click.dateUTC", date7dFrom ] },
                        { $lte: [ "$$click.dateUTC", dateToNow ] },
                      ]
                    }
                  }
               }
            }
          },
          {
            $unwind: '$clicks'
          },
          {
            $group: {
              _id: '$clicks.dateUTCHuman',
              numOfClicks: {
                $sum: 1
              }
            }
          },
          {
            $sort: {
              _id: 1
            }
          }
        ],
        "deviceStatsMobDesk": [
          {
            $unwind: '$clicks'
          },
          {
            $group: {
              _id: {
                mobile:'$clicks.useragent.isMobile',
                desktop:'$clicks.useragent.isDesktop',
              },
              numOfClicks: {
                $sum: 1
              }
            }
          }
        ],
        "deviceStatsBrowser": [
          {
            $unwind: '$clicks'
          },
          {
            $group: {
              _id: {
                chrome:'$clicks.useragent.isChrome',
                opera:'$clicks.useragent.isOpera',
                IE:'$clicks.useragent.isIE',
                safari:'$clicks.useragent.isSafari',
                fireFox:'$clicks.useragent.isFirefox',
              },
              numOfClicks: {
                $sum: 1
              }
            }
          }
        ],
        "deviceStatsDeviceType": [
          {
            $unwind: '$clicks'
          },
          {
            $group: {
              _id: {
                iphone:'$clicks.useragent.isIphone',
                android:'$clicks.useragent.isAndroid'
              },
              numOfClicks: {
                $sum: 1
              }
            }
          }
        ],
        "geo": [
          {
            $unwind: '$clicks'
          },
          {
            $group: {
              _id: {
                country: '$clicks.geo'
              },
              numOfClicks: {
                $sum: 1
              }
            }
          }
        ]
      }
    }
  ])

  if (!oneLinkStats) {
    return next(new AppError('Can not aggregate data', 404))
  }
  res.status(200).json({
    status: 'success',
    data: {
      stats: oneLinkStats
    }
  })
})

/** End of EditLink handler */


exports.randomUrl = catchAsync(async (req, res, next) => {
  if (req.body.randomURL) {
    const randomURL_gen = await randomize('Aa0', 6)
    res
      .status(201)
      .json({
        status: 'success',
        message: {
          randomURL: randomURL_gen
        }
      })
  } else {
    return next(new AppError('Smth went wrong. Please check random url handler or try again later', 404))
  }
})

exports.createUrl = catchAsync(async (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  if (req.body.randomURL) {
    const randomURL = randomize('Aa0', 6)

    const randomUrlCast = await Url.findOne({ randomUrlAlias: randomURL })

    if (randomUrlCast) {
      return next(new AppError('Generated random URL already in use', 400))
    }

    const randomUrlObject = await Url.create(_.extend(req.body, { creatorIP: ip, urlAlias: randomURL }))

    if (!randomUrlObject) {
      return next(new AppError('Smth went wrong. Please try again later', 500))
    }

    res
      .status(201)
      .json({
        status: 'success',
        message: {
          url: randomUrlObject
        }
      })
  }

  if ( req.body.recaptchaToken === undefined || req.body.recaptchaToken === '' || req.body.recaptchaToken === null ) {
    return next(new AppError(`Captcha is empty`, 400))
  }

  const secretKey = process.env.SECRET_KEY

  const urlAlias = req.body.urlAlias

  const urlAliasCast = await Url.findOne({ urlAlias })

  if (urlAliasCast) {
    return next(new AppError(`Given short URL - /${req.body.urlAlias} - already in use`, 400))
  }

  const verifyUrl = `https://google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${req.body.recaptchaToken}&remoteip=${ip}`

  request(verifyUrl, (error, response, body) => {
    body = JSON.parse(body)
    if (body.success !== undefined && !body.success) {
      return next(new AppError(`Failed captcha verification`, 400))
    }
  })
  const url = await Url.create(_.extend({
    longUrl: req.body.longUrl,
    urlAlias: req.body.urlAlias,
    creator: req.body.creator
  }, { creatorIP: ip }))

  if(!url) {
    return next(new AppError(`Can not create shorten URL`, 404))
  }

  res
    .status(201)
    .json({
      status: 'success',
      success: true,
      url,
      message: {
        result: `copy.vg/${url.urlAlias}`,
        captcha: 'Captcha passed'
      }
    })
})


exports.rocketTarget = catchAsync(async (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  const filteredUseragent = _.pick(req.useragent, function(value, key, object) {
    return value != false
  })

  if(geoip.lookup(ip) == null) {
    const shortenURLObject = await Url.findOneAndUpdate (
      { urlAlias: req.params.short }, { $push: { clicks: { ip, geo: 'not recognized',
        useragent: filteredUseragent, dateUTC: dayjs.utc().add(0, 'day'), dateUTCHuman: dayjs.utc().add(0, 'day').format('DD MMM YYYY') }}}
    )
    if (!shortenURLObject) {
      return next(new AppError(`No such shorten URL: ${req.params.short}`, 404))    
    }

    if (shortenURLObject.longUrl.startsWith('http') || shortenURLObject.longUrl.startsWith('https')) {
      res.status(200).json({
        status: 'success',
        data: {
          target: `${shortenURLObject.longUrl}`
        }
      })
    } else {
      res.status(200).json({
        status: 'success',
        data: {
          target: `http://${shortenURLObject.longUrl}`
        }
      })
    }

  

  } else {
    const shortenURLObject = await Url.findOneAndUpdate (
      { urlAlias: req.params.short }, { $push: { clicks: { ip, geo: getName(geoip.lookup(ip).country),
        useragent: filteredUseragent, dateUTC: dayjs.utc().add(0, 'day'), dateUTCHuman: dayjs.utc().add(0, 'day').format('DD MMM YYYY') }}} 
    )
    if (!shortenURLObject) {
      return next(new AppError(`No such shorten URL: ${req.params.short}`, 404))    
    }

    if (shortenURLObject.longUrl.startsWith('http') || shortenURLObject.longUrl.startsWith('https')) {
      res.status(200).json({
        status: 'success',
        data: {
          target: `${shortenURLObject.longUrl}`
        }
      })
    } else {
      res.status(200).json({
        status: 'success',
        data: {
          target: `http://${shortenURLObject.longUrl}`
        }
      })
    }
  }
})
