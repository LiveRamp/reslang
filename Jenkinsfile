#!/usr/bin/env groovy

@Library("liveramp-base@v2") _

pipeline {

  options {
    ansiColor('xterm')
  }

  triggers {
    // Github hook to build whenever a commit is pushed
    githubPush()
  }

  agent any

  stages {
    stage('Build Docker Image') {
      steps {
        script {
           sh 'tests'
        }
      }
    }
  }
}
