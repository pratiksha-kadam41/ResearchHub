async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    if (response.status >= 500) {
      throw new Error(
        "The backend returned an unexpected error page. Check that the backend is running and its database connection is configured.",
      );
    }

    throw new Error(`The server returned an unexpected response (HTTP ${response.status}).`);
  }

  return response.json();
}

export async function createRepository(token, repositoryData, memberEmails = []) {
  const response = await fetch("/api/repositories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: repositoryData.name,
      description: repositoryData.description,
      domain: repositoryData.domain,
      researchType: repositoryData.type || repositoryData.researchType,
      privacy: repositoryData.privacy,
      memberEmails,
    }),
  });
  const result = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(result.message || "Unable to create this repository.");
  }

  return result;
}
