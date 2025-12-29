// @bun
import{AppAPIError as t}from"@lombokapp/app-worker-sdk";import{SignedURLsRequestMethod as n}from"@lombokapp/types";var i=async function(e,{serverClient:r}){if(!e.targetLocation?.objectKey)throw new t("INVALID_TASK_DATA","Missing target location or object key");let o=await r.getContentSignedUrls([{folderId:e.targetLocation.folderId,objectKey:e.targetLocation.objectKey,method:n.GET}]);if("error"in o)throw Error(o.error.message);console.log("From within object_added worker:",{objectFetchUrl:o.result[0]?.url??"",envVars:process.env})};export{i as handleTask};

//# debugId=707BF3809BFD2BDF64756E2164756E21
