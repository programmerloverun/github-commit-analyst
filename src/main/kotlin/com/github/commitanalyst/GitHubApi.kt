package com.github.commitanalyst

import com.google.gson.*
import okhttp3.*
import java.io.IOException
import java.util.concurrent.TimeUnit

data class RepoInfo(
    val id: Long, val owner: String, val name: String, val fullName: String,
    val stars: Int, val language: String, val description: String,
    val isPrivate: Boolean, val isFork: Boolean
)

data class CommitStats(
    val totalCommits: Int, val totalAdditions: Int, val totalDeletions: Int,
    val repoCount: Int, val repos: List<RepoCommitStats>
)

data class RepoCommitStats(
    val fullName: String, val commits: Int, val additions: Int, val deletions: Int
)

class GitHubApi {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    private val gson = Gson()

    fun fetchRepos(username: String, token: String?): List<RepoInfo> {
        val repos = mutableListOf<RepoInfo>()
        var page = 1
        while (true) {
            val url = "https://api.github.com/users/$username/repos?per_page=100&page=$page&sort=updated"
            val json = get(url, token) ?: break
            val arr = gson.fromJson(json, JsonArray::class.java) ?: break
            if (arr.size() == 0) break
            for (elem in arr) {
                val obj = elem.asJsonObject
                if (obj.get("fork")?.asBoolean == true) continue
                repos.add(RepoInfo(
                    id = obj.get("id")?.asLong ?: 0,
                    owner = obj.get("owner")?.asJsonObject?.get("login")?.asString ?: "",
                    name = obj.get("name")?.asString ?: "",
                    fullName = obj.get("full_name")?.asString ?: "",
                    stars = obj.get("stargazers_count")?.asInt ?: 0,
                    language = obj.get("language")?.asString ?: "",
                    description = obj.get("description")?.asString ?: "",
                    isPrivate = obj.get("private")?.asBoolean ?: false,
                    isFork = false
                ))
            }
            if (arr.size() < 100) break
            page++
        }
        return repos
    }

    fun fetchCommitStats(
        username: String, repos: List<RepoInfo>, token: String?,
        since: String?, until: String?
    ): CommitStats {
        var totalCommits = 0
        var totalAdditions = 0
        var totalDeletions = 0
        val repoStats = mutableListOf<RepoCommitStats>()

        for (repo in repos) {
            var commits = 0
            var additions = 0
            var deletions = 0
            var page = 1

            while (true) {
                val params = mutableListOf("per_page=100", "page=$page")
                if (since != null) params.add("since=$since")
                if (until != null) params.add("until=$until")
                if (repo.owner != username) params.add("author=$username")

                val url = "https://api.github.com/repos/${repo.fullName}/commits?${params.joinToString("&")}"
                val json = get(url, token) ?: break
                val arr = gson.fromJson(json, JsonArray::class.java) ?: break
                if (arr.size() == 0) break

                for (elem in arr) {
                    val obj = elem.asJsonObject
                    val sha = obj.get("sha")?.asString ?: continue
                    val detailUrl = "https://api.github.com/repos/${repo.fullName}/commits/$sha"
                    val detailJson = get(detailUrl, token) ?: continue
                    val detail = gson.fromJson(detailJson, JsonObject::class.java) ?: continue
                    val stats = detail.getAsJsonObject("stats")
                    if (stats != null) {
                        commits++
                        additions += stats.get("additions")?.asInt ?: 0
                        deletions += stats.get("deletions")?.asInt ?: 0
                    }
                }
                if (arr.size() < 100) break
                page++
            }

            if (commits > 0) {
                repoStats.add(RepoCommitStats(repo.fullName, commits, additions, deletions))
                totalCommits += commits
                totalAdditions += additions
                totalDeletions += deletions
            }
        }

        return CommitStats(totalCommits, totalAdditions, totalDeletions, repoStats.size, repoStats)
    }

    private fun get(url: String, token: String?): String? {
        val builder = Request.Builder().url(url).header("Accept", "application/vnd.github.v3+json")
        if (token != null) builder.header("Authorization", "Bearer $token")
        return try {
            val resp = client.newCall(builder.build()).execute()
            if (resp.code == 403 || resp.code == 401) throw IOException("Rate limited")
            if (!resp.isSuccessful) return null
            resp.body?.string()
        } catch (e: IOException) {
            null
        }
    }
}
