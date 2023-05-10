# Contributing to the ODD SDK

Thank you for helping to improve the project! We are so happy that you are contributing! 💖

You can contribute to the ODD SDK at any level. Whether you are new to web development or have been at it for ages doesn't matter. We can use your help!

**No contribution is too small, and all contributions are valued.**

This guide will help you to get started. It includes many details, but don't let that turn you away. Consider this a map to help you navigate the process, and please reach out to us with any questions and concerns in the `#odd-sdk` channel on our [Discord server][discord].

## Conduct

Please review our [Code of Conduct][coc] which describes the behavior we expect from all contributors. Please be kind, inclusive, and considerate when interacting with contributors and maintainers.

## Contributing in issues

You can contribute by [opening an issue][issue] to request a feature or report a bug. We also welcome comments on an issue, bug reproductions, and pull requests if you see how to address an issue.

If you are still determining the details of a feature request, you can start with a [discussion][discussions] where we can informally discuss what you have on your mind.

**Anyone can participate in any stage of contribution**. We urge you to
join in the discussion around bugs and comment on pull requests.

### Asking for help

If you have reviewed our [documentation][docs] and still have questions or are having problems, ask for help in the `#odd-sdk` channel on our [Discord server][discord] or [start a discussion][discussions].

### Submitting a bug report

We provide a template to give you a starting point when submitting a bug report. Please fill this template in with all relevant information, but feel free to delete any sections that do not apply.

The most important information is describing the problem and how it impacts you. We also invite you to propose a solution, which could be a description of expected behavior.

We very much appreciate it if you could include a [short, self-contained, correct example][sscce] that demonstrates the issue.

## Pull requests

Pull requests are how we make changes to the ODD SDK.

Even tiny pull requests to fix typos or improve comments are welcome. Before submitting a significant PR, it is usually best to start by [opening an issue][issue] or [starting a discusssion][discussions]. Taking one of these steps increases the likelihood that your PR will be merged.

All commits must be signed before a pull request will be accepted. See the GitHub [signing commits][signing] and [telling git about your signing key][telling-git] documentation. We recommend generating a new SSH key for signing if you are setting up signing for the first time.

We squash and merge all PRs. Orderly, well-written commits will help us during review, but we don't require a pristine commit history.

Add an entry to the CHANGELOG if your pull request adds a feature or fixes a bug.

### Tests

If your change alters existing code, please run the test suites:

```sh
npm run test
npm run test:imports
npm run test:types
```

If you are adding a new feature, please add tests that prove the code works correctly and reference them when you submit the pull request.

### Opening a pull request

We provide a [pull request template][template] to give you a starting point when creating a pull request. Please fill this template in, but feel free to delete any sections that do not apply or that you are unsure about.

If your pull request is a typo fix or an update to documentation, please add the `no changelog` label _before_ submitting your pull request.

### Discuss and update

You will likely receive feedback or requests for changes to your pull request. Don't be discouraged! Pull request reviews help us all to collaborate and produce better code. Some reviewers may sign off immediately, and others may have more detailed comments and feedback. It's all part of the process of evaluating whether the changes are correct and necessary.

**Once the PR is open, do not rebase the commits.** Add more commits to address feedback. We will squash and merge all contributions, and we may clean up the history recorded in the final commit.

### Merging

The primary goals for a pull request are to improve the codebase and for the contributor to succeed. Some pull requests may not be merged at the end of the day, but that does not indicate failure. If your pull request is not merged, please know that your efforts are appreciated and will have an impact on how we think about the codebase in the long run.

[coc]: ./CODE_OF_CONDUCT.md
[discord]: https://fission.codes/discord/ 
[discussions]: https://github.com/oddsdk/ts-odd/discussions
[docs]: https://docs.odd.dev/
[issue]: https://github.com/oddsdk/ts-odd/issues
[sscce]: http://www.sscce.org/
[signing]: https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits
[telling-git]: https://docs.github.com/en/authentication/managing-commit-signature-verification/telling-git-about-your-signing-key
[template]: .github/PULL_REQUEST_TEMPLATE.md
