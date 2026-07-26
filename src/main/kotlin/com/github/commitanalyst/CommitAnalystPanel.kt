package com.github.commitanalyst

import com.intellij.icons.AllIcons
import com.intellij.openapi.project.Project
import com.intellij.ui.*
import com.intellij.ui.components.*
import com.intellij.util.ui.JBUI
import java.awt.*
import javax.swing.*

class CommitAnalystPanel(private val project: Project) : JBPanel<CommitAnalystPanel>(BorderLayout()) {

    private val api = GitHubApi()
    private val usernameField = JBTextField()
    private val tokenField = JBPasswordField()
    private val fetchBtn = JButton("Fetch Repos")
    private val analyzeBtn = JButton("Analyze")
    private val repoPanel = JBPanel<JBPanel<*>>(BoxLayout.Y_AXIS).apply { isVisible = false }
    private val resultPanel = JBPanel<JBPanel<*>>(BoxLayout.Y_AXIS).apply { isVisible = false }
    private val statusLabel = JBLabel("", SwingConstants.CENTER)

    private var repos = listOf<RepoInfo>()
    private var selected = mutableSetOf<Long>()

    init {
        border = JBUI.Borders.empty(12)
        buildInputPanel()
    }

    private fun buildInputPanel() {
        val panel = JBPanel<JBPanel<*>>(GridBagLayout())
        val gbc = GridBagConstraints().apply { fill = GridBagConstraints.HORIZONTAL; insets = JBUI.insets(4, 0) }

        gbc.gridx = 0; gbc.gridy = 0; gbc.gridwidth = 2
        panel.add(JBLabel("<html><h3>GitHub Commit Analyst</h3></html>"), gbc)

        gbc.gridwidth = 1
        gbc.gridx = 0; gbc.gridy = 1
        panel.add(JBLabel("Username"), gbc)
        gbc.gridx = 1
        usernameField.emptyText.text = "GitHub username"
        panel.add(usernameField, gbc)

        gbc.gridx = 0; gbc.gridy = 2
        panel.add(JBLabel("Token (optional)"), gbc)
        gbc.gridx = 1
        tokenField.emptyText.text = "Personal access token"
        panel.add(tokenField, gbc)

        gbc.gridx = 0; gbc.gridy = 3; gbc.gridwidth = 2
        fetchBtn.addActionListener { fetchRepos() }
        panel.add(fetchBtn, gbc)

        gbc.gridy = 4
        statusLabel.foreground = JBColor.GRAY
        panel.add(statusLabel, gbc)

        gbc.gridy = 5
        panel.add(repoPanel, gbc)

        gbc.gridy = 6
        panel.add(resultPanel, gbc)

        add(panel, BorderLayout.NORTH)
    }

    private fun fetchRepos() {
        val username = usernameField.text.trim()
        if (username.isEmpty()) {
            statusLabel.text = "Enter a username"
            return
        }
        statusLabel.text = "Fetching repos..."
        fetchBtn.isEnabled = false

        Thread {
            try {
                repos = api.fetchRepos(username, tokenField.password.let { String(it).ifEmpty { null } })
                selected.clear(); selected.addAll(repos.map { it.id })
                SwingUtilities.invokeLater {
                    buildRepoList()
                    statusLabel.text = "${repos.size} repos found"
                    fetchBtn.isEnabled = true
                }
            } catch (e: Exception) {
                SwingUtilities.invokeLater {
                    statusLabel.text = "Error: ${e.message}"
                    fetchBtn.isEnabled = true
                }
            }
        }.start()
    }

    private fun buildRepoList() {
        repoPanel.removeAll()
        repoPanel.isVisible = true

        val scroll = JBScrollPane(repoPanel).apply {
            preferredSize = Dimension(0, 300)
            border = JBUI.Borders.empty()
        }

        for (repo in repos) {
            val cb = JBCheckBox("${repo.name}  ★ ${repo.stars}").apply {
                isSelected = selected.contains(repo.id)
                addActionListener {
                    if (isSelected) selected.add(repo.id) else selected.remove(repo.id)
                    analyzeBtn.text = "Analyze (${selected.size})"
                }
            }
            repoPanel.add(cb)
        }

        analyzeBtn.text = "Analyze (${selected.size})"
        analyzeBtn.addActionListener { runAnalysis() }

        val btnPanel = JBPanel<JBPanel<*>>(FlowLayout(FlowLayout.RIGHT))
        btnPanel.add(analyzeBtn)
        repoPanel.add(btnPanel)
        repoPanel.revalidate()
        repoPanel.repaint()

        // Re-attach scroll pane
        val parent = repoPanel.parent
        if (parent is JBPanel<*>) {
            // Add scroll at correct position
        }
        add(scroll, BorderLayout.CENTER)
        revalidate()
        repaint()
    }

    private fun runAnalysis() {
        val selectedRepos = repos.filter { selected.contains(it.id) }
        if (selectedRepos.isEmpty()) return
        statusLabel.text = "Analyzing ${selectedRepos.size} repos..."
        analyzeBtn.isEnabled = false

        Thread {
            try {
                val stats = api.fetchCommitStats(
                    usernameField.text.trim(), selectedRepos, tokenField.password.let { String(it).ifEmpty { null } },
                    null, null
                )
                SwingUtilities.invokeLater {
                    showResults(stats)
                    statusLabel.text = ""
                    analyzeBtn.isEnabled = true
                }
            } catch (e: Exception) {
                SwingUtilities.invokeLater {
                    statusLabel.text = "Error: ${e.message}"
                    analyzeBtn.isEnabled = true
                }
            }
        }.start()
    }

    private fun showResults(stats: CommitStats) {
        resultPanel.removeAll()
        resultPanel.isVisible = true

        val sb = StringBuilder("<html><h4>Results</h4>")
        sb.append("Commits: <b>${stats.totalCommits}</b> &nbsp; ")
        sb.append("Additions: <b style='color:green'>+${stats.totalAdditions}</b> &nbsp; ")
        sb.append("Deletions: <b style='color:red'>-${stats.totalDeletions}</b><br><br>")

        sb.append("<b>Repos (${stats.repoCount}):</b><br>")
        for (r in stats.repos) {
            sb.append("&nbsp; ${r.fullName} — ${r.commits} commits<br>")
        }
        sb.append("</html>")

        resultPanel.add(JBLabel(sb.toString()))
        resultPanel.revalidate()
        resultPanel.repaint()
    }
}
