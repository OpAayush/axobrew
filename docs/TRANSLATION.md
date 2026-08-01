# Translating axobrew

If you'd like to help translate axobrew into your language, you can do so by following these steps:
# Outdated, TODO

## Fork the Repository

First, fork the [axobrew repository](https://github.com/OpAayush/axobrew) on GitHub.

## Copy the English Translation File

Copy the `en.json` file from the `lang` directory and rename it to the appropriate language and country code. For example, if you're translating axobrew into French, you would rename the file to `fr_FR.json`. See ISO 639-2 and ISO 3166-1 alpha-2 for a list of language and country codes.

## Translate the File

Translate the contents of the file into your language. Do not translate the text between the curly braces (`{}`).

## Add Your Language to the Languages List

Add your language to the `resources` object in [here](https://github.com/OpAayush/axobrew/blob/main/axobrew-app/axobrew/axobrew-ui/src/components/i18nResources.js#L20) following the same format as the other languages (`English Name (Native Name)`).

## Submit a Pull Request

Once you've finished translating the file, submit a pull request to the main axobrew repository.


## Done!

That's it! Your translation will be reviewed and merged into the main axobrew repository. Thank you for your help!
