import { Application, Context } from "probot";
import getValidConfig from "./ConfigBuilder";
import isBodyValid from "./IssueBodyChecker";

// const addComment = `
//   mutation($id: ID!, $body: String!) {
//     addComment(input: {subjectId: $id, body: $body}) {
//       clientMutationId
//     }
//   }
// `;

// const getLabelInRepo = `
//   query($owner: String!, $name: String!, $labelName: String!) {
//     repository(name: $name, owner: $owner) {
//       label(name: $labelName) {
//         name
//       }
//     }
//   }
// `;

export const app = (app: Application) => {
  app.on(["issues.opened", "issues.edited", "issues.reopened"], async (context: Context) => {
    const config = await getValidConfig(context);
    const body: string = context.payload.issue.body;
    const isValid: boolean = await isBodyValid(body, config);
    if (!isValid) {
      await addLabelToIssue(context, config);
      if (context.payload.action !== "edited") {
        await addCommentToIssue(context, config);
      }
    } else {
      await removeLabelFromIssue(context, config);
    }
  });

  async function createLabelIfNotExists (context: Context, labelName: string, labelColor: string) {
    const {owner, repo} = context.repo();
    // const doesLabelExist = await context.github.query(getLabelInRepo, {
    //   owner,
    //   name: repo,
    //   labelName: labelName
    // });
    return context.github.issues.getLabel({owner, repo, name: labelName}).catch(() => {
      return context.github.issues.createLabel({owner, repo, name: labelName, color: labelColor});
    });
  }

  async function addLabelToIssue (context: Context, config: any) {
    const issueLabel = context.issue({labels: [config.labelName]});
    await createLabelIfNotExists(context, config.labelName, config.labelColor);
    return context.github.issues.addLabels(issueLabel);
  }

  async function removeLabelFromIssue (context: Context, config: any) {
    const labelName = config.labelName;
    const labelRemoval = context.issue({name: labelName});
    return context.github.issues.removeLabel(labelRemoval);
  }

  async function addCommentToIssue (context: Context, config: any) {
    const commentText = context.issue({body: config.commentText});
    return context.github.issues.createComment(commentText);
    // return context.github.query(addComment, {
    //   id: context.payload.issue.node_id,
    //   body: config.commentText
    // });
  }
};

export default app;
