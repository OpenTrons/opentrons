const AWS = require('aws-sdk')

function checkCurrentAWSProfile() {
  return new Promise((resolve, reject) => {
    const credentials = new AWS.SharedIniFileCredentials()

    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
      reject(
        new Error(
          'AWS credentials not found. Please configure your AWS credentials before running this script.'
        )
      )
    } else {
      const currentProfile = credentials.profile
      console.log(`Current AWS profile: ${credentials.profile}`)
      resolve(currentProfile)
    }
  })
}

module.exports = { checkCurrentAWSProfile }
